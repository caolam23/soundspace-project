import React, {useEffect, useState} from 'react';
import api from '../services/api';
export default function AdminPanel(){
  const [users, setUsers] = useState([]);

  useEffect(()=>{
    (async ()=>{
      try{
        const res = await api.get('/admin/users');
        setUsers(res.data);
      }catch(err){
        alert(err.response?.data?.msg || 'Không có quyền');
      }
    })();
  },[]);

  const del = async (id) => {
    if (!confirm('Xóa user?')) return;
    await api.delete(`/admin/users/${id}`);
    setUsers(users.filter(u=>u._id !== id));
  };

  const promote = async (id) => {
    await api.post(`/admin/users/${id}/promote`);
    setUsers(users.map(u => u._id === id ? {...u, role:'admin'} : u));
  };

  return (
    <div>
      <h2>Admin Panel</h2>
      <ul>
        {users.map(u => (
          <li key={u._id}>
            {u.email} - {u.role}
            <button onClick={()=>promote(u._id)}>Promote</button>
            <button onClick={()=>del(u._1d)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
