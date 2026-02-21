import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AdminPanel = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [novoUser, setNovoUser] = useState({ nome: '', setor: 'SAC', login: '', senha: '' });

    const API_URL = "http://localhost:8000";

    useEffect(() => {
        fetchUsuarios();
    }, []);

    const fetchUsuarios = async () => {
        try {
            const res = await axios.get(`${API_URL}/usuarios/`);
            setUsuarios(res.data);
        } catch (e) {
            console.error("Erro ao carregar usuários");
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/usuarios/`, null, { params: novoUser });
            setNovoUser({ nome: '', setor: 'SAC', login: '', senha: '' });
            fetchUsuarios();
            alert("Usuário criado com sucesso!");
        } catch (e) {
            alert("Erro ao criar usuário. Verifique se o login já existe.");
        }
    };

    const handleDelete = async (id) => {
        if(window.confirm("Deseja remover este acesso?")) {
            await axios.delete(`${API_URL}/usuarios/${id}`);
            fetchUsuarios();
        }
    };

    const inputStyle = {
        background: '#0b0e14',
        border: '1px solid #2d3436',
        color: 'white',
        padding: '10px',
        borderRadius: '8px',
        marginRight: '10px',
        marginBottom: '10px',
        outline: 'none'
    };

    return (
        <div style={{ padding: '20px', color: 'white' }}>
            <h2 style={{ marginBottom: '20px' }}>🛠️ Gestão de Equipe (Admin)</h2>
            
            <form onSubmit={handleCreate} style={{ background: '#131720', padding: '25px', borderRadius: '15px', border: '1px solid #2d3436', marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px', color: '#00d2ff' }}>Cadastrar Novo Membro</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input placeholder="Nome Completo" value={novoUser.nome} onChange={e => setNovoUser({...novoUser, nome: e.target.value})} style={inputStyle} required />
                    <input placeholder="Login" value={novoUser.login} onChange={e => setNovoUser({...novoUser, login: e.target.value})} style={inputStyle} required />
                    <input type="password" placeholder="Senha" value={novoUser.senha} onChange={e => setNovoUser({...novoUser, senha: e.target.value})} style={inputStyle} required />
                    
                    <select value={novoUser.setor} onChange={e => setNovoUser({...novoUser, setor: e.target.value})} style={inputStyle}>
                        <option value="SAC">SAC</option>
                        <option value="Financeiro">Financeiro</option>
                        <option value="Back-office">Back-office</option>
                        <option value="Emissão">Emissão</option>
                        <option value="Admin">Admin</option>
                    </select>
                    
                    <button type="submit" style={{ background: '#00b894', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>
                        Criar Acesso
                    </button>
                </div>
            </form>

            <div style={{ background: '#131720', borderRadius: '15px', border: '1px solid #2d3436', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#1c222d', color: '#00d2ff' }}>
                            <th style={{ padding: '15px' }}>Nome</th>
                            <th style={{ padding: '15px' }}>Setor</th>
                            <th style={{ padding: '15px' }}>Login</th>
                            <th style={{ padding: '15px' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid #2d3436' }}>
                                <td style={{ padding: '15px' }}>{u.nome}</td>
                                <td style={{ padding: '15px' }}>
                                    <span style={{ background: 'rgba(0, 210, 255, 0.1)', color: '#00d2ff', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>
                                        {u.setor.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ padding: '15px' }}>{u.login}</td>
                                <td style={{ padding: '15px' }}>
                                    <button onClick={() => handleDelete(u.id)} style={{ background: 'rgba(231, 76, 60, 0.2)', border: '1px solid #e74c3c', color: '#e74c3c', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer' }}>Excluir</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminPanel;