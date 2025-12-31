DO $$
DECLARE
  hk1 INT; hk2 INT; hk3 INT; hk4 INT; hk5 INT;
  head1 INT; head2 INT; head3 INT; head4 INT; head5 INT;
BEGIN
  -- ======================
  -- HỘ 1 (4 người)
  -- ======================
  INSERT INTO ho_khau ("soHoKhau","diaChi","tinhThanh","quanHuyen","phuongXa","duongPho","soNha","diaChiDayDu","ngayCap","trangThai","ghiChu")
  VALUES (generate_ho_khau_code(), 'Số 42 Vương Thừa Vũ', 'Hà Nội', 'Hà Đông', 'La Khê', 'Vương Thừa Vũ', '42',
          'Số 42 Vương Thừa Vũ, La Khê, Hà Đông, Hà Nội', '2024-01-15', 'inactive', 'Dữ liệu seed')
  RETURNING id INTO hk1;

  INSERT INTO nhan_khau ("hoTen", cccd, "ngaySinh", "gioiTinh", "hoKhauId", "quanHe", "trangThai")
  VALUES ('Nguyễn Văn Hùng', '012345670001', '1980-05-12', 'nam', hk1, 'chu_ho', 'active')
  RETURNING id INTO head1;

  INSERT INTO nhan_khau ("hoTen", cccd, "ngaySinh", "gioiTinh", "hoKhauId", "quanHe", "trangThai")
  VALUES
    ('Trần Thị Lan',  '012345670002', '1982-09-20', 'nu',  hk1, 'vo_chong', 'active'),
    ('Nguyễn Thị Linh','012345670003','2006-03-10','nu',  hk1, 'con',      'tam_vang'),
    ('Nguyễn Minh Quân','012345670004','2010-11-25','nam', hk1, 'con',      'active');

  UPDATE ho_khau SET "chuHoId" = head1, "trangThai" = 'active' WHERE id = hk1;

  -- ======================
  -- HỘ 2 (3 người)
  -- ======================
  INSERT INTO ho_khau ("soHoKhau","diaChi","tinhThanh","quanHuyen","phuongXa","duongPho","soNha","diaChiDayDu","ngayCap","trangThai","ghiChu")
  VALUES (generate_ho_khau_code(), 'Số 5 Nguyễn Trãi', 'Hà Nội', 'Hà Đông', 'Mộ Lao', 'Nguyễn Trãi', '5',
          'Số 5 Nguyễn Trãi, Mộ Lao, Hà Đông, Hà Nội', '2023-06-01', 'inactive', 'Dữ liệu seed')
  RETURNING id INTO hk2;

  INSERT INTO nhan_khau ("hoTen", cccd, "ngaySinh", "gioiTinh", "hoKhauId", "quanHe", "trangThai")
  VALUES ('Phạm Văn Hải', '012345670011', '1975-02-02', 'nam', hk2, 'chu_ho', 'active')
  RETURNING id INTO head2;

  INSERT INTO nhan_khau ("hoTen", cccd, "ngaySinh", "gioiTinh", "hoKhauId", "quanHe", "trangThai")
  VALUES
    ('Lê Thị Hạnh', '012345670012', '1978-07-14', 'nu',  hk2, 'vo_chong', 'active'),
    ('Phạm Anh Tuấn','012345670013', '2002-12-08','nam', hk2, 'con',      'tam_tru');

  UPDATE ho_khau SET "chuHoId" = head2, "trangThai" = 'active' WHERE id = hk2;

  -- ======================
  -- HỘ 3 (5 người)
  -- ======================
  INSERT INTO ho_khau ("soHoKhau","diaChi","tinhThanh","quanHuyen","phuongXa","duongPho","soNha","diaChiDayDu","ngayCap","trangThai","ghiChu")
  VALUES (generate_ho_khau_code(), 'Số 18 Tố Hữu', 'Hà Nội', 'Hà Đông', 'Vạn Phúc', 'Tố Hữu', '18',
          'Số 18 Tố Hữu, Vạn Phúc, Hà Đông, Hà Nội', '2022-10-10', 'inactive', 'Dữ liệu seed')
  RETURNING id INTO hk3;

  INSERT INTO nhan_khau ("hoTen", cccd, "ngaySinh", "gioiTinh", "hoKhauId", "quanHe", "trangThai")
  VALUES ('Đỗ Văn Nam', '012345670021', '1968-04-30', 'nam', hk3, 'chu_ho', 'active')
  RETURNING id INTO head3;

  INSERT INTO nhan_khau ("hoTen", cccd, "ngaySinh", "gioiTinh", "hoKhauId", "quanHe", "trangThai")
  VALUES
    ('Nguyễn Thị Mai', '012345670022', '1970-01-19', 'nu',  hk3, 'vo_chong', 'active'),
    ('Đỗ Thị Thu',     '012345670023', '1995-08-03', 'nu',  hk3, 'con',      'active'),
    ('Đỗ Văn Đức',     '012345670024', '1998-09-22', 'nam', hk3, 'con',      'active'),
    ('Đỗ Thị An',      '012345670025', '2004-05-15', 'nu',  hk3, 'con',      'active');

  UPDATE ho_khau SET "chuHoId" = head3, "trangThai" = 'active' WHERE id = hk3;

  -- ======================
  -- HỘ 4 (4 người)
  -- ======================
  INSERT INTO ho_khau ("soHoKhau","diaChi","tinhThanh","quanHuyen","phuongXa","duongPho","soNha","diaChiDayDu","ngayCap","trangThai","ghiChu")
  VALUES (generate_ho_khau_code(), 'Số 9 Quang Trung', 'Hà Nội', 'Hà Đông', 'Quang Trung', 'Quang Trung', '9',
          'Số 9 Quang Trung, Quang Trung, Hà Đông, Hà Nội', '2021-03-03', 'inactive', 'Dữ liệu seed')
  RETURNING id INTO hk4;

  INSERT INTO nhan_khau ("hoTen", cccd, "ngaySinh", "gioiTinh", "hoKhauId", "quanHe", "trangThai")
  VALUES ('Bùi Văn Cường', '012345670031', '1986-06-06', 'nam', hk4, 'chu_ho', 'active')
  RETURNING id INTO head4;

  INSERT INTO nhan_khau ("hoTen", cccd, "ngaySinh", "gioiTinh", "hoKhauId", "quanHe", "trangThai")
  VALUES
    ('Phan Thị Hương', '012345670032', '1988-02-28', 'nu',  hk4, 'vo_chong', 'active'),
    ('Bùi Minh Khôi',  '012345670033', '2012-10-01', 'nam', hk4, 'con',      'active'),
    ('Bùi Thu Hà',     '012345670034', '2016-01-17', 'nu',  hk4, 'con',      'active');

  UPDATE ho_khau SET "chuHoId" = head4, "trangThai" = 'active' WHERE id = hk4;

  -- ======================
  -- HỘ 5 (3 người)
  -- ======================
  INSERT INTO ho_khau ("soHoKhau","diaChi","tinhThanh","quanHuyen","phuongXa","duongPho","soNha","diaChiDayDu","ngayCap","trangThai","ghiChu")
  VALUES (generate_ho_khau_code(), 'Số 27 Lê Lợi', 'Hà Nội', 'Hà Đông', 'Yết Kiêu', 'Lê Lợi', '27',
          'Số 27 Lê Lợi, Yết Kiêu, Hà Đông, Hà Nội', '2020-12-12', 'inactive', 'Dữ liệu seed')
  RETURNING id INTO hk5;

  INSERT INTO nhan_khau ("hoTen", cccd, "ngaySinh", "gioiTinh", "hoKhauId", "quanHe", "trangThai")
  VALUES ('Vũ Văn Thành', '012345670041', '1990-09-09', 'nam', hk5, 'chu_ho', 'active')
  RETURNING id INTO head5;

  INSERT INTO nhan_khau ("hoTen", cccd, "ngaySinh", "gioiTinh", "hoKhauId", "quanHe", "trangThai")
  VALUES
    ('Ngô Thị Ngọc',  '012345670042', '1992-04-04', 'nu',  hk5, 'vo_chong', 'active'),
    ('Vũ Gia Bảo',    '012345670043', '2018-07-07', 'nam', hk5, 'con',      'active');

  UPDATE ho_khau SET "chuHoId" = head5, "trangThai" = 'active' WHERE id = hk5;

END $$;