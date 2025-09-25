import React, {useEffect} from 'react';
import { useNavigate } from 'react-router-dom';

export default function AuthSuccess(){
  const nav = useNavigate();
  useEffect(()=>{
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if(token){
      localStorage.setItem('token', token);
      // redirect to home
      nav('/');
    }else{
      nav('/login');
    }
  }, [nav]);

  return <div>Đang đăng nhập...</div>;
}
