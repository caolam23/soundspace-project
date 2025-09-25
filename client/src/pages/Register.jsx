import React, {useState} from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function Register(){
  const [form,setForm] = useState({username:'',email:'',password:'',confirmPassword:''});
  const nav = useNavigate();

  const submit = async (e)=>{
    e.preventDefault();
    try{
      const res = await api.post('/auth/register', form);
      alert(res.data.msg);
      nav('/login');
    }catch(err){
      alert(err.response?.data?.msg || 'Lỗi');
    }
  };

  return (
    <form onSubmit={submit}>
      <input placeholder="Username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/>
      <input placeholder="Email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/>
      <input type="password" placeholder="Password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/>
      <input type="password" placeholder="Confirm Password" value={form.confirmPassword} onChange={e=>setForm({...form,confirmPassword:e.target.value})}/>
      <button>Đăng ký</button>
    </form>
  );
}
