# Brain — timeline chat học từ Signal

> Tài liệu làm việc và theo dõi tiến độ. Kế hoạch triển khai: [plan.md](./plan.md). Chỉ đánh dấu hoàn thành khi đã có bằng chứng kiểm thử; cập nhật tài liệu này sau mỗi giai đoạn.

## Mục tiêu

- Mở đúng vùng tin, cuộn lịch sử hai chiều mượt và giữ vị trí đang đọc.
- Tin realtime không tạo khoảng trống giả trong timeline; nút về cuối phải đưa tới **tin mới nhất thực sự**.
- Giữ optimistic UI, không mất tin hoặc nhân đôi khi HTTP, socket, reconnect và phân trang chạy đồng thời.
- Học hành vi từ Signal, nhưng giữ TanStack Query/Virtual hiện có; không sao chép kiến trúc database/Redux của Signal.

## Trạng thái

- [x] Đọc luồng timeline LemonUI, Threema Web, Signal Desktop và hợp đồng liên quan trong LemonCore.
- [x] Ghi kế hoạch và các phụ thuộc giữa frontend/backend.
- [ ] P0 — Viết test tái hiện, xác minh API bằng e2e và đo baseline browser.
- [ ] P1 — Sửa đối soát tin gửi optimistic/socket (đã thêm correlation sender-only, retry tự động một lần và nút retry cùng key trong phiên; chưa kiểm thử đầy đủ reconnect/race).
- [ ] P2 — Timeline liên tục và trạng thái latest rõ ràng (đã có `hasLatest` và ẩn live ngoài cửa sổ; chưa kiểm thử race end-to-end).
- [ ] P3 — Jump-to-latest và gửi khi đang đọc lịch sử (đã có tải lại latest và nút jump; chưa kiểm thử browser/race).
- [ ] P4 — Giữ anchor, resize, media và paging.
- [ ] P5 — Khôi phục vị trí đọc khi chuyển hội thoại (đã khôi phục theo message còn trong cache; chưa hỗ trợ tải quanh anchor ngoài cache).
- [ ] P6 — Unread theo visibility và mở tại unread (đã báo read theo message hiện ra khi cửa sổ focus; chưa có divider/mở tại unread).
- [ ] Tổng kiểm thử và cập nhật kết quả.

Các acceptance criteria liên quan layout/scroll vẫn chưa được xác minh trên browser thật.

## Bất biến cần giữ

1. **`isNearBottom` khác `hasLatest`**: cuối cửa sổ đang render không chứng minh đã có latest trên server.
2. Không render tin realtime ngay sau một đoạn lịch sử cũ nếu chưa chứng minh phần giữa liên tục.
3. Bám đáy khi người dùng đang theo latest; không kéo người đang đọc lịch sử.
4. Reset/jump phải có đường lỗi an toàn; không làm mất tin optimistic, tin live hoặc vị trí hiện tại chỉ vì request lỗi.
5. Phân trang, reconnect, socket và HTTP có thể hoàn thành sai thứ tự; không để kết quả chat cũ cuộn hay ghi đè chat mới.
6. Thứ tự server là `(createdAt, id)`; xử lý tie và dedup nhất quán. Không dùng timestamp một mình làm cursor.
7. Đọc từng phần không mặc định đồng nghĩa unread bằng 0; không suy đoán mốc unread từ mỗi `unreadCount`.

## Hợp đồng LemonCore đã xác minh từ source

### Timeline

- `GET /api/conversations/:id/messages?limit=&cursor=`: không cursor lấy trang mới nhất; `cursor` lấy tin **cũ hơn**, thứ tự `(createdAt DESC, id DESC)`.
- `GET ...?after=<messageId>`: lấy tin **mới hơn**, thứ tự `(createdAt ASC, id ASC)`. Hai tham số `cursor` và `after` không được gửi cùng nhau.
- Default 30, max 50. Response `items`, `hasMore`, `nextCursor?`; khi còn dữ liệu `nextCursor` là ID item cuối trong thứ tự response, phải dùng làm cursor cho cùng hướng.
- Tin có `deletedAt` bị loại khỏi kết quả timeline. Cursor/after được xác minh là message thuộc conversation; không hợp lệ hoặc không thuộc conversation bị từ chối. Việc cursor bị thu hồi/xóa vật lý cần test riêng, không suy đoán từ API public.
- Endpoint kiểm tra quyền thành viên và điều kiện chat; lỗi quyền hoặc mất friendship không được coi là hết lịch sử.
- Nguồn: `LemonCore/src/domain/message/controller.ts:72`, `service.ts:209`, `pg.ts:208`, `src/domain/pagination.constants.ts:4`.

### Gửi, socket và optimistic

- Backend nhận `clientMsgId` để idempotency; retry cùng key có thể trả lại cùng message ID.
- **Hợp đồng đang triển khai:** HTTP response gửi tin và timeline trả `clientMsgId` chỉ cho sender; `message:new` vẫn không chứa trường này. Event `message:correlated` gửi riêng tới user room của sender trước broadcast. Socket có thể tới trước HTTP; event có thể bị bỏ lỡ.
- Vì vậy không thể bảo đảm ghép optimistic với socket chỉ bằng `clientMsgId` như frontend hiện giả định. Không ghép theo body/thời gian vì có thể nhầm hai tin giống nhau. HTTP response có thể ánh xạ message ID với mutation tương ứng khi về, nhưng chưa đủ để luôn tránh duplicate tạm thời trước response hoặc khi HTTP thất bại sau khi server đã commit.
- Thay đổi này là additive và không lộ correlation trong conversation room. Khi hai lần gửi đều lỗi mạng, UI giữ tin chưa xác định và cho retry cùng payload/key trong phiên; khi reload, payload tạm không được lưu bền. Cần kiểm thử các trường hợp mất event/reconnect trước khi hoàn tất P1.
- Backend phát `message:new`, `message:updated`, `message:revoked`, `message:reaction`, `read:updated` tới conversation room; socket tự join các conversation active khi kết nối. Phát realtime là best-effort; không coi socket là nguồn đầy đủ sau reconnect.
- Nguồn: `LemonCore/src/domain/message/service.ts:179`, `dto/mapper.ts:100`, `test/e2e/chat-1-1.e2e-spec.ts:210`, `src/domain/realtime/realtime.service.ts:25`, `chat.gateway.ts:128`.

### Read/unread

- `POST /api/conversations/:id/read` nhận UUID `lastReadMessageId` thuộc conversation; backend cập nhật con trỏ theo `(createdAt, id)` chỉ tiến, sau đó phát `read:updated`. Response chỉ có thông báo, không trả unread count.
- Backend đếm tin chưa đọc dựa trên tin của người khác, chưa bị thu hồi và nằm sau con trỏ; đọc từng phần được hỗ trợ ở tầng lưu trữ.
- DTO conversation cố ý không trả `lastReadMessageId`; chỉ trả `unreadCount`. Hiện không thấy endpoint tải quanh message hoặc trả oldest unread. Không thể xác định chính xác vị trí unread chỉ từ count.
- Read event vẫn được phát sau lời gọi update; không mặc định payload luôn là con trỏ mới nhất nếu có request cũ đến trễ. Cần kiểm thử race và đồng bộ lại theo nguồn authoritative.
- Nguồn: `LemonCore/src/domain/conversation/controller.ts:67`, `service.ts:388`, `pg.ts:344`, `dto/mapper.ts:4`.

## So sánh và quyết định kiến trúc

- **Signal**: `haveNewest` phân biệt vùng loaded với latest; không thêm tin mới vào cửa sổ cũ thiếu đoạn giữa; jump có thể tải latest; lưu message gần giữa viewport; anchor khác nhau cho tải cũ/mới. Nguồn: `Signal-Desktop/ts/state/ducks/conversations.preload.ts:6687`, `ts/components/conversation/Timeline.dom.tsx:281`, `ts/util/timelineUtil.std.ts:157`.
- **Threema**: append/prepend mảng và giữ đáy bằng scroll-glue; đơn giản nhưng không có cửa sổ 3 trang tương đương. Nguồn: `threema-web/src/threema/container.ts:420`, `src/partials/messenger.conversation.html:56`.
- **LemonUI**: 30 tin/trang, tối đa 3 trang timeline, live cache riêng, virtualizer, prefetch 2 trang cũ. Giữ các thành phần này nếu đáp ứng invariant; không mặc định rằng ba trang giới hạn cả `liveMessages`.

## Quyết định sản phẩm cần xác nhận

- Mở lại chat: khôi phục vị trí khi không unread hay luôn về latest? Đề xuất giống Signal; ban đầu chỉ khôi phục trong phiên.
- Khi đang đọc cũ và tự gửi: chuyển về latest ngay khi bắt đầu gửi hay sau khi gửi thành công? Đề xuất ngay, nhưng phải giữ tin/draft và xử lý lỗi.
- Mark read: chỉ khi tin thực sự nhìn thấy và trang có focus? Đây là thay đổi semantics, triển khai sau khi xác nhận.
- Correlation optimistic: chọn hợp đồng backend cụ thể trước khi tuyên bố dedup tuyệt đối; chưa được phép tự sửa LemonCore trong tác vụ tài liệu này.

## Nhật ký

- 2026-11-13: Lập tài liệu từ source hiện có; phát hiện `clientMsgId` không xuất hiện trong DTO và read cursor không được public. Chưa chạy test; chưa sửa source ứng dụng.
- 2026-11-13: Bắt đầu P1: sender-only correlation trên HTTP/timeline và socket riêng, LemonUI gắn optimistic ID; test unit mục tiêu và build UI/typecheck Core đã chạy. P1 và các phase timeline/scroll chưa hoàn tất; chưa chạy e2e/browser.
- 2026-11-13: Bắt đầu P2/P3: phân biệt latest theo page param, tránh render live ngoài cửa sổ liên tục, nút jump tải lại latest khi cần. Unit: LemonUI 96/96, LemonCore 801/801; build UI và lint hai repo đạt (UI có một cảnh báo effect). PostgreSQL local không phản hồi `pg_isready`; chưa chạy e2e DB hay kiểm thử browser. P0 và P1–P6 vẫn chưa hoàn tất.
- 2026-11-13: Hai nhánh local đổi thành `fix/chat-timeline` (Core còn upstream `origin/perf`). Chạy PostgreSQL/Valkey test cô lập, migrate rồi chạy e2e chat 28/28 và socket 8/8, gồm test correlation chỉ đến sender; đã dừng tài nguyên test. Thêm retry mạng một lần cùng payload, restore message còn cache và mark read theo viewport/focus; chưa kiểm thử browser, chưa có unread divider/anchor ngoài cache.
- 2026-11-13: Giữ tin optimistic và hiển thị trạng thái chưa xác định sau hai lỗi mạng, thay vì khẳng định đã gửi thất bại. LemonUI 100/100 unit test, build đạt; vẫn cần UI retry cùng `clientMsgId`, kiểm thử browser và hoàn thiện P0–P6. Các commit và thay đổi user không liên quan được giữ riêng.
- 2026-11-13: Bổ sung nút retry tin chưa xác định với cùng `clientMsgId` và payload đã upload trong bộ nhớ phiên; không thêm tin optimistic trùng. Nếu retry bị từ chối vẫn giữ trạng thái chưa xác định. Lỗi mạng và HTTP 5xx đều được coi là kết quả chưa chắc chắn. LemonUI 102/102 unit test, build và lint đạt (còn một cảnh báo effect); chưa kiểm thử browser.
- 2026-11-14: Baseline commit LemonUI `5a6a97d`, LemonCore `151490d`, Signal `848443afc`; LemonUI đã có thay đổi scroll chưa commit trước khi kiểm tra. Sửa reconnect dùng cursor từ timeline thay vì tin live/optimistic và giới hạn 50 theo API; thêm unit test chọn cursor. LemonUI: 109/109 test, build, fmt và fmt:check đạt; lint đạt với hai cảnh báo effect (`CallWindowProvider`, `ConversationView`), build cảnh báo chunk lớn. Chưa kiểm thử browser, reconnect/race end-to-end hoặc đo baseline; P0–P6 chưa hoàn tất và không được coi là đã xác minh.
- 2026-11-14: Reconnect không coi cursor thiếu/lặp là đồng bộ thành công, và ưu tiên dữ liệu live khi response reconnect về sau event mới. Thêm nút tải tin cũ cho viewport không cuộn được, chặn tải hai hướng khi infinite query đang fetch. LemonUI: 111/111 unit test, build và fmt:check đạt; lint vẫn có hai cảnh báo effect. Chưa kiểm chứng scroll, nút mới và reconnect trên browser hoặc end-to-end.
- 2026-11-14: Playwright/Chromium với API giả lập 120 tin: tải trang cũ sau eviction, jump về tin mới nhất và gửi text không trùng đều đạt; viewport 390px không tràn ngang. A → B → A không đạt: anchor `m104` về `m102` với sai offset; đã tránh restore trước khi scroll container sẵn sàng nhưng chưa giải quyết sai lệch khi virtualizer đo lại. Không đánh dấu P4/P5 hoàn tất. PostgreSQL không chạy; chưa kiểm thử backend/socket thật, ảnh tải trễ, screen reader hay reconnect.
