// src/pages/AuthSuccess.jsx

import React, { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext'; // <-- Quan trọng: Import Context của bạn
import axios from 'axios';

export default function AuthSuccess() {
    const navigate = useNavigate();
    const { loginSuccess } = useContext(AuthContext); // <-- Quan trọng: Lấy hàm cập nhật state


    useEffect(() => {
        // Lấy token từ URL search params
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        // Hàm để lấy thông tin user từ server bằng token
        const fetchUserAndLogin = async (jwtToken) => {
            try {
                // 1. Lưu token vào localStorage ngay lập tức
                localStorage.setItem('token', jwtToken);

                // 2. Dùng token để gọi API lấy thông tin đầy đủ của user (bao gồm cả avatar)
                const res = await axios.get('http://localhost:8800/api/auth/profile', {
                    headers: {
                        Authorization: `Bearer ${jwtToken}`
                    }
                });

                const user = res.data; // API /profile trả về object user { id, username, email, avatar, role }

                if (user) {
                    // 3. Cập nhật state toàn cục của ứng dụng qua Context
                    localStorage.setItem('role', user.role); // Lưu thêm role để kiểm tra quyền
                    loginSuccess(jwtToken, user); // Đây là bước quan trọng nhất để UI cập nhật

                    // 4. Chuyển hướng người dùng dựa trên vai trò (role)
                    if (user.role === 'admin') {
                        navigate('/admin');
                    } else {
                        navigate('/user-home');
                    }
                } else {
                    // Nếu API không trả về user, coi như token không hợp lệ
                    throw new Error("Không thể lấy thông tin người dùng.");
                }

            } catch (error) {
                console.error("Lỗi trong quá trình đăng nhập:", error);
                // Nếu có lỗi, xóa token đã lưu và chuyển về trang đăng nhập
                localStorage.removeItem('token');
                localStorage.removeItem('role');
                navigate('/auth');
            }
        };

        if (token) {
            fetchUserAndLogin(token);
        } else {
            // Nếu không có token trong URL, chuyển thẳng về trang đăng nhập
            navigate('/auth');
        }

        // Thêm `loginSuccess` và `Maps` vào dependency array của useEffect
    }, [navigate, loginSuccess]);

    // Hiển thị thông báo loading trong khi xử lý
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
            fontFamily: 'sans-serif',
            fontSize: '1.2rem'
        }}>
            Đang xử lý đăng nhập, vui lòng chờ...
        </div>
    );
}