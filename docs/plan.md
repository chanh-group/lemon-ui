# Kế hoạch triển khai timeline LemonUI theo Signal

Theo dõi tiến độ, hợp đồng và quyết định tại [brain.md](./brain.md). Đây là kế hoạch, chưa phải thay đổi đã triển khai.

## Phạm vi và thứ tự

P0 kiểm chứng → P1 đối soát gửi tin → P2 timeline liên tục → P3 latest/send → P4 anchor → P5 restore → P6 unread. Có thể viết test song song, nhưng không triển khai các phần phụ thuộc hợp đồng backend trước khi hợp đồng được duyệt.

Giữ cấu trúc hiện tại, TanStack Query và Virtual. Chỉ thêm abstraction khi cần để kiểm thử/đảm bảo hành vi; không thêm database offline, thư viện scroll mới hoặc tính năng Signal không liên quan.

## P0 — Baseline và hợp đồng

- [ ] Ghi version/commit LemonUI, LemonCore, Signal đang phân tích; kiểm tra thay đổi chưa commit trước khi sửa code.
- [ ] Tạo test hoặc checklist tái hiện: tải quá 3 trang, nhận tin, gửi tin, jump, chuyển chat, reconnect; phân biệt bug tái hiện với nguy cơ lý thuyết.
- [ ] Viết/chạy test LemonCore đối với `cursor`/`after`, giới hạn 30/50, trùng timestamp, cursor không thuộc chat, message bị thu hồi và phân trang khi có ghi đồng thời.
- [ ] Xác nhận thứ tự `(createdAt, id)` và cách API xử lý cursor đã thu hồi/xóa; frontend phải xử lý lỗi, không biến lỗi thành `hasMore=false`.
- [ ] Kiểm tra semantics thực tế của `maxPages`, `getPreviousPageParam` và `hasPreviousPage`; đặc biệt sau khi prefetch, eviction và quay lại latest. Không dùng riêng `hasPreviousPage` làm bằng chứng `hasLatest` nếu chưa chứng minh.
- [ ] Đo baseline browser với ảnh tải trễ và viewport ngắn; lưu kết quả, không tự đặt ngưỡng hiệu năng khi chưa đo.

**Xong khi:** có kết quả test/bằng chứng và mọi giả định ảnh hưởng thiết kế đều được ghi tại `brain.md`.

## P1 — Correlation optimistic, socket và HTTP

**Đang triển khai:** LemonCore đã bổ sung `clientMsgId` chỉ cho sender trong response/timeline và event `message:correlated` riêng cho sender; broadcast `message:new` vẫn không lộ trường này. LemonUI retry một lần cùng payload và giữ trạng thái chưa xác định nếu tiếp tục lỗi mạng. Chưa có UI retry cùng key sau hai lần lỗi, chưa hoàn tất P1.

- [x] Chọn hợp đồng correlation chỉ dành cho sender qua HTTP, timeline và event socket riêng; broadcast chung giữ nguyên.
- [ ] Hoàn tất thay đổi LemonCore kèm test mapper/service/socket/e2e, đặc biệt quyền riêng tư và retry; cập nhật và kiểm tra LemonUI tương ứng.
- [ ] Reconcile optimistic ↔ server theo correlation và ID; không match theo nội dung/thời gian. Giữ rollback và preview hiện có; xử lý server commit thành công nhưng HTTP lỗi/timeout bằng retry idempotent cùng key.
- [ ] Test socket trước/sau HTTP, response trùng, retry, hai tin nội dung giống nhau, gửi nhiều tin song song, đổi chat và reconnect.

**Fallback nếu backend chưa đổi:** ánh xạ optimistic với server ID khi HTTP thành công; chấp nhận/document khả năng duplicate tạm hoặc trạng thái chưa chắc chắn trước response. Không khẳng định exactly-once và không xóa optimistic chỉ vì lỗi mạng không chứng minh server chưa commit.

**Xong khi:** mỗi tin có một identity chính xác sau đối soát; trạng thái không chắc chắn không bị trình bày như thất bại chắc chắn.

## P2 — Timeline liên tục và latest

Đang thực hiện: đã thêm `hasLatest`, lọc live ngoài cửa sổ và test unit cơ bản; còn race, reconnect và kiểm thử tích hợp.

File chính: `src/features/chat/hooks/useChatQueries.ts`, `useChatRealtime.ts`, `components/ChatShell.tsx`; các test cạnh file tương ứng.

- [ ] Xác định biểu diễn `hasLatest` dựa trên provenance của cửa sổ và kết quả fetch, không dựa vào vị trí viewport. Khi reconnect hoặc mất sự kiện, trạng thái latest phải được xác nhận lại.
- [ ] Tách phần timeline liên tục khỏi tin live chưa thể ghép. Không render khoảng thiếu như hai tin liên tiếp; không xóa tin pending chỉ vì trang khác được tải.
- [ ] Sắp xếp và dedup nhất quán theo identity và thứ tự server; xử lý timestamp trùng. Cân nhắc timestamp serialization/độ chính xác từ backend trước khi dựa vào so sánh client.
- [ ] Giữ luồng edit/revoke/reaction cho cả cached pages và pending live; quy định xử lý tin bị thu hồi trong window vì API timeline lọc `deletedAt` nhưng socket gửi revoke.
- [ ] Đảm bảo các response cũ không ghi đè state mới sau đổi chat/jump/reconnect; dọn observer/timer và không để `liveMessages` tăng vô hạn không có chính sách.

**Xong khi:** đang đọc trang cũ mà có realtime không tạo gap giả; khi quay lại latest, các tin tồn tại đúng một lần; không mất tin khi race/socket/reconnect theo hợp đồng đã chốt ở P1.

## P3 — Về latest và gửi khi đọc lịch sử

Đang thực hiện: nút jump và sau gửi gọi tải latest khi cần; còn test browser, kiểm tra race và thất bại.

File chính: `ConversationView.tsx`, `MessageList.tsx`, `ChatShell.tsx`, `useChatQueries.ts`.

- [ ] Thêm một thao tác điều phối `goToLatest`: nếu latest đã được xác nhận thì scroll, nếu chưa thì fetch trang latest không cursor, commit window khi thành công và chỉ scroll sau render.
- [ ] Bảo vệ các request đồng thời bằng cách phù hợp với TanStack Query; xử lý tin socket/optimistic tới trong lúc fetch. Không xóa window hiện tại trước khi fetch thay thế thành công.
- [ ] Nút xuống cuối dùng `goToLatest`; hiện trạng thái loading/lỗi và hỗ trợ retry, dùng label phù hợp kể cả không có tin chưa đọc.
- [ ] Khi tự gửi ở vùng cũ, đưa về latest theo UX đã duyệt; xử lý song song lỗi fetch latest, timeout gửi, optimistic, attachment và text người dùng gõ thêm.
- [ ] Kiểm thử latest trống, chat mới, ấn lặp, chuyển chat giữa request và socket đến khi reset.

**Xong khi:** jump đến latest thực sự, gửi không tạo gap/duplicate hoặc mất draft; lỗi để lại view có thể phục hồi.

## P4 — Neo vị trí và phân trang

- [ ] Phân loại sự kiện: initial, prepend older, append newer page, realtime, send, jump, resize/media. Chốt hành vi scroll riêng cho từng sự kiện giống tinh thần `getScrollAnchorBeforeUpdate` của Signal.
- [ ] Giữ key message ổn định; kiểm tra kỹ khi optimistic ID đổi sang server ID và khi row ngày/group thay đổi.
- [ ] Điều phối một nguồn quyết định scroll, rà soát tương tác `followOnAppend`, `followBottom`, `useLayoutEffect`, `scrollTop` và imperative scroll; không ép cuộn khi đang đọc lịch sử.
- [ ] Với prepend/eviction, đo anchor và offset trước/sau khi cần; ưu tiên cơ chế virtualizer hiện tại nếu test chứng minh ổn. Xử lý row media đổi kích thước và resize.
- [ ] Giữ guard chống request lặp và kiểm tra cạnh tranh tải hai hướng. Với nội dung ngắn không đủ cuộn nhưng còn trang cũ, có lối tải tiếp rõ ràng mà không tạo vòng lặp.
- [ ] Cân nhắc ngưỡng gần đáy/prefetch theo đo thực tế; 15 px của Signal không phải giá trị phải sao chép.

**Xong khi:** browser test chứng minh viewport ổn định khi prepend/append, eviction, ảnh tải trễ và resize; người dùng chủ động cuộn luôn được ưu tiên.

## P5 — Khôi phục vị trí khi quay lại conversation

Đang thực hiện: ghi message đầu viewport trong phiên và khôi phục khi message còn trong cache; chưa lưu offset chính xác, chưa tải anchor ngoài cache, chưa kiểm thử browser.

- [ ] Sau khi UX được duyệt, lưu message ID + offset theo conversation trong bộ nhớ phiên khi rời view; không lưu chỉ số mảng vì danh sách thay đổi.
- [ ] Nếu anchor còn trong cache, khôi phục sau khi render/đo. Nếu anchor bị xóa, cache bị evict hoặc request lỗi, fallback về latest có thông báo/trạng thái phù hợp.
- [ ] Nếu cần khôi phục anchor ngoài cache, thiết kế hợp đồng backend tải quanh message và test quyền/trường hợp message không còn. API hiện tại không cung cấp endpoint around; không tải tuần tự vô hạn qua toàn bộ lịch sử như giải pháp mặc định.
- [ ] Test chuyển chat nhanh, anchor ảnh thay chiều cao, anchor bị thu hồi và trường hợp có unread.

**Xong khi:** chuyển A → B → A khôi phục được vị trí hợp lệ hoặc fallback nhất quán; không ảnh hưởng conversation khác.

## P6 — Read theo visibility và mốc unread

Đang thực hiện: báo message incoming có đáy trong viewport khi document visible/focus; làm mới unread từ backend và nghe read event của chính user. Chưa hỗ trợ divider/mở tại unread; cần kiểm thử focus, concurrent read và ảnh hưởng multi-device trên browser.

Đây là thay đổi semantics; thực hiện sau khi UX và hợp đồng backend được duyệt.

- [ ] Chốt thế nào là đã thấy: conversation active, document/window focus, mức visibility của message cao, tin cao hơn viewport và thời gian chờ.
- [ ] Báo read tiến dần theo message thực sự đã thấy, throttle, tránh gửi ID tạm. Backend đã bảo đảm con trỏ DB chỉ tiến nhưng event của request cũ vẫn có thể phát; client không được coi mọi event là authoritative.
- [ ] Bỏ cả hai đường mark-read ngay khi mở/nhận tin nếu chuyển semantics; cập nhật unread đúng bằng số liệu authoritative, không mặc định reset 0 sau partial read. Xử lý event từ thiết bị khác.
- [ ] Muốn divider/mở tại unread: mở rộng API cho mốc unread/last-read và tải quanh message, hoặc hợp đồng khác có xác nhận. DTO hiện không trả mốc này; không suy ra bằng cách đếm ngược `unreadCount`.
- [ ] Test partial read, người dùng gửi xen tin nhận, tin bị thu hồi, mất focus, event sai thứ tự, multi-device, lỗi read và unread > kích thước cửa sổ.

**Xong khi:** chỉ đánh dấu theo chính sách đã duyệt, unread chính xác và không hồi lùi; divider chỉ hiển thị khi có mốc đáng tin.

## Kiểm thử và hoàn tất

- [ ] Chạy test liên quan, `bun run test`, `bun run lint`, `bun run build` tại LemonUI; ghi kết quả thực tế và mọi lỗi có sẵn.
- [ ] Nếu có thay đổi LemonCore: chạy typecheck/lint/unit và e2e cần DB theo quy định repo đó; ghi dependency môi trường.
- [ ] Browser thật: lịch sử dài, media chậm, resize, nội dung ngắn, reconnect, gửi khi ở lịch sử, chuyển chat nhanh, screen reader/keyboard và reduced motion.
- [ ] Không thêm framework browser test mặc định: dùng checklist thủ công trước; nếu tự động hóa cần đề xuất phụ thuộc riêng.
- [ ] Cập nhật checkbox, quyết định và rủi ro còn lại trong `brain.md`; review diff không chạm thay đổi người dùng ngoài phạm vi.
