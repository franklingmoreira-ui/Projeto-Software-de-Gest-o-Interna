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

    // Estilo dos inputs agora com as variáveis dinâmicas!
    const inputStyle = {
        background: 'var(--bg-color)',
        border: '1px solid var(--border-color)',
        color: 'var(--text-color)',
        padding: '10px',
        borderRadius: '8px',
        marginRight: '10px',
        marginBottom: '10px',
        outline: 'none'
    };

    return (
        <div style={{ padding: '20px', color: 'var(--text-color)' }}>
            <h2 style={{ marginBottom: '20px' }}>🛠️ Gestão de Equipe (Admin)</h2>
            
            {/* Fundo do Formulário */}
            <form onSubmit={handleCreate} style={{ background: 'var(--card-bg)', padding: '25px', borderRadius: '15px', border: '1px solid var(--border-color)', marginBottom: '30px' }}>
                <h3 style={{ marginBottom: '15px', color: 'var(--accent-color)' }}>Cadastrar Novo Membro</h3>
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
                    
                    <button type="submit" style={{ background: 'var(--accent-color)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px' }}>
                        Criar Acesso
                    </button>
                </div>
            </form>

            {/* Fundo da Tabela */}
            <div style={{ background: 'var(--card-bg)', borderRadius: '15px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: 'var(--header-bg)', color: 'var(--accent-color)' }}>
                            <th style={{ padding: '15px' }}>Nome</th>
                            <th style={{ padding: '15px' }}>Setor</th>
                            <th style={{ padding: '15px' }}>Login</th>
                            <th style={{ padding: '15px' }}>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {usuarios.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '15px', color: 'var(--text-color)' }}>{u.nome}</td>
                                <td style={{ padding: '15px' }}>
                                    <span style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--accent-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                                        {u.setor.toUpperCase()}
                                    </span>
                                </td>
                                <td style={{ padding: '15px', color: 'var(--text-color)' }}>{u.login}</td>
                                <td style={{ padding: '15px' }}>
                                    <button onClick={() => handleDelete(u.id)} style={{ background: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', padding: '5px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Excluir</button>
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