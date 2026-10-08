# Quy chuẩn mã nguồn (Code Style)

* Viết mã sạch, rõ ràng, tuân thủ nguyên tắc SOLID và DRY (Don't Repeat Yourself).
* Đặt tên biến, hàm, class bằng tiếng Anh theo quy tắc camelCase cho biến/hàm và PascalCase cho class/components.
* Hạn chế tối đa việc sử dụng kiểu dữ liệu `any` (nếu dùng TypeScript), luôn định nghĩa kiểu dữ liệu rõ ràng.

# Cấu trúc & Quản lý nhánh Git

* Tên nhánh (Branch): `feature/tên-tính-năng`, `bugfix/mã-lỗi`, `hotfix/nội-dung`.
* Commit Message: Theo chuẩn Conventional Commits (`feat: ...`, `fix: ...`, `refactor: ...`, `docs: ...`).
* Không push trực tiếp lên nhánh `main` hoặc `dev`; mọi thay đổi phải thông qua Pull Request (PR).

# Xử lý lỗi & Kiểm thử (Error Handling & Testing)

* Luôn kiểm tra ngoại lệ (`try-catch`) tại các tầng gọi API hoặc thao tác cơ sở dữ liệu.
* Viết unit test cho các hàm xử lý logic nghiệp vụ quan trọng trước khi tạo PR.

# Quy định khi Jules/AI tạo mã

* Không tự ý thay đổi cấu trúc thư mục cốt lõi nếu không có yêu cầu.
* Khi chỉnh sửa tệp cấu hình (Docker, Git, CI/CD), cần giữ nguyên các biến môi trường và thông số hiện có.
* Cung cấp giải thích ngắn gọn bằng tiếng Việt cho các đoạn code phức tạp hoặc logic mới được thêm vào.
