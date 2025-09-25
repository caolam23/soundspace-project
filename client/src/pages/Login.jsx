import React, {useState} from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Login(){
  const [form,setForm] = useState({identifier:'', password:''});
  const nav = useNavigate();

  const submit = async (e)=>{
    e.preventDefault();
    try{
      const res = await api.post('/auth/login', form);
      localStorage.setItem('token', res.data.token);
      alert(res.data.msg);
      nav('/');
    }catch(err){
      alert(err.response?.data?.msg || 'Lỗi đăng nhập');
    }
  };

  const googleLogin = ()=>{
    // redirect to backend to start OAuth
    window.location.href = 'http://localhost:8800/api/auth/google';
  };

  return (
    <div>
      <form onSubmit={submit}>
        <input placeholder="Email hoặc username" value={form.identifier} onChange={e=>setForm({...form,identifier:e.target.value})}/>
        <input type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
        <button>Login</button>
      </form>

      <hr/>
      <button onClick={googleLogin}>Đăng nhập bằng Google</button>
    </div>
  );
}
