import { useState, useEffect } from 'react';

const Modal = ({ show, onClose, children }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-end">
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '' });
  const [newPassword, setNewPassword] = useState('');
  const [originalPassword, setOriginalPassword] = useState(''); // State for original password

  const API_URL = '/api/users';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setUsers(data.map(u => ({...u, id: u._id})));
    } catch (error) {
      console.error("Failed to fetch users:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });
      if (response.ok) {
        fetchUsers();
        setAddModalOpen(false);
        setNewUser({ username: '', email: '', password: '' });
      } else {
        const error = await response.json();
        alert(`Failed to add user: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to add user:", error);
    }
  };
  
  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const response = await fetch(`${API_URL}/${userId}`, {
          method: 'DELETE',
        });
        if (response.ok) {
          fetchUsers();
        } else {
          const error = await response.json();
          alert(`Failed to delete user: ${error.message}`);
        }
      } catch (error) {
        console.error("Failed to delete user:", error);
      }
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setNewPassword('');
    setOriginalPassword(''); // Reset original password
    setEditModalOpen(true);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    const body = { password: newPassword };
    if (selectedUser.role === 'Super Admin') {
      body.originalPassword = originalPassword;
    }

    try {
      const response = await fetch(`${API_URL}/${selectedUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (response.ok) {
        setEditModalOpen(false);
        alert('Password updated successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to update password: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to update password:", error);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">管理员列表</h1>
        <button onClick={() => setAddModalOpen(true)} className="bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700">
          新增管理员
        </button>
      </div>

      {/* Add User Modal */}
      <Modal show={isAddModalOpen} onClose={() => setAddModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-4">新增管理员</h2>
        <form onSubmit={handleAddUser}>
           <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
              用户名
            </label>
            <input type="text" id="username" name="username" value={newUser.username} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" required />
          </div>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              邮箱
            </label>
            <input type="email" id="email" name="email" value={newUser.email} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" required />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              密码
            </label>
            <input type="password" id="password" name="password" value={newUser.password} onChange={handleInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" required />
          </div>
          <div className="flex items-center justify-end">
            <button type="button" onClick={() => setAddModalOpen(false)} className="bg-gray-500 text-white font-bold py-2 px-4 rounded hover:bg-gray-600 mr-2">取消</button>
            <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700">确认新增</button>
          </div>
        </form>
      </Modal>

      {/* Edit Password Modal */}
      <Modal show={isEditModalOpen} onClose={() => setEditModalOpen(false)}>
        <h2 className="text-2xl font-bold mb-4">为 {selectedUser?.username} 更改密码</h2>
        <form onSubmit={handlePasswordChange}>
          {selectedUser?.role === 'Super Admin' && (
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="originalPassword">
                原始密码
              </label>
              <input type="password" id="originalPassword" value={originalPassword} onChange={(e) => setOriginalPassword(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" required />
            </div>
          )}
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="newPassword">
              新密码
            </label>
            <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" required />
          </div>
          <div className="flex items-center justify-end">
            <button type="button" onClick={() => setEditModalOpen(false)} className="bg-gray-500 text-white font-bold py-2 px-4 rounded hover:bg-gray-600 mr-2">取消</button>
            <button type="submit" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded hover:bg-indigo-700">确认更改</button>
          </div>
        </form>
      </Modal>

      <div className="mt-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full leading-normal">
            <thead>
               <tr>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">用户</th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">角色</th>
                <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">{user.username}</p>
                    <p className="text-gray-600 whitespace-no-wrap">{user.email}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                    <p className="text-gray-900 whitespace-no-wrap">{user.role}</p>
                  </td>
                  <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                    <button onClick={() => openEditModal(user)} className="text-indigo-600 hover:text-indigo-900">更改密码</button>
                    {user.role !== 'Super Admin' && (
                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900 ml-4">删除</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UsersPage;
