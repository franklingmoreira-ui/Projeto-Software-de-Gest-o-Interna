import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Paperclip, Send, Download, Users, Lock, FileText, LayoutDashboard, Settings, Sun, Moon } from 'lucide-react';
import AdminPanel from './AdminPanel.jsx';

const App = () => {
  // 1. ESTADOS PRINCIPAIS
  const [usuarioLogado, setUsuarioLogado] = useState(() => {
    try {
      const salvo = localStorage.getItem('usuario_erp');
      return salvo ? JSON.parse(salvo) : null;
    } catch (e) { return null; }
  });

  const [darkMode, setDarkMode] = useState(() => {
    const salvo = localStorage.getItem('theme');
    return salvo ? JSON.parse(salvo) : true;
  });

  useEffect(() => {
    if (darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    localStorage.setItem('theme', JSON.stringify(darkMode));
  }, [darkMode]);

  // ESTADOS DE DADOS
  const [abaAtiva, setAbaAtiva] = useState('kanban');
  const [formLogin, setFormLogin] = useState({ login: '', senha: '' });
  const [tarefas, setTarefas] = useState([]);
  const [chatGlobal, setChatGlobal] = useState([]);
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [tarefaAberta, setTarefaAberta] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [arquivoComentario, setArquivoComentario] = useState(null);
  
  // ESTADO DO FILTRO (Importante para o Admin!)
  const [setorAtivo, setSetorAtivo] = useState('Todos');
  
  const [novaMsgGlobal, setNovaMsgGlobal] = useState('');
  const [novo, setNovo] = useState({ 
    titulo: '', setor: '', desc: '', link_flip: '', link_chat: '', tipo_financeiro: '', prazo: '24' 
  });

  const setores = ["Financeiro", "Back-office", "SAC", "Emissão", "Admin"];
  const tiposFinanceiro = ["Reembolso Cliente (24 horas)", "Reembolso Padrão", "Estorno Carteira (Wallet)", "Estorno Conta Cliente (PIX)", "Reembolso de Taxas"];
  const API_URL = "http://localhost:8000";
  const fimDoChatRef = useRef(null);

  // 3. FUNÇÕES DE CARREGAMENTO E LÓGICA
  const obterEstiloSLA = (descricao) => {
    if (!descricao) return { borderLeft: '6px solid var(--border-color)' };
    if (descricao.includes("PRAZO:24h")) return { borderLeft: '6px solid #ff7675' };
    if (descricao.includes("PRAZO:48h")) return { borderLeft: '6px solid #fdcb6e' };
    if (descricao.includes("PRAZO:72h")) return { borderLeft: '6px solid var(--accent-color)' };
    return { borderLeft: '6px solid var(--border-color)' };
  };

  const carregarDados = async () => {
    if (!usuarioLogado) return;
    try {
      const [resT, resC, resU] = await Promise.all([
        axios.get(`${API_URL}/tarefas/`),
        axios.get(`${API_URL}/chat/`),
        axios.get(`${API_URL}/usuarios/`)
      ]);
      setTarefas(resT.data || []);
      setChatGlobal(resC.data || []);
      setListaUsuarios(resU.data || []);
    } catch (e) { console.log("Erro na rede..."); }
  };

  useEffect(() => {
    if (usuarioLogado) {
      localStorage.setItem('usuario_erp', JSON.stringify(usuarioLogado));
      carregarDados();
      const i = setInterval(carregarDados, 3000);
      return () => clearInterval(i);
    } else { localStorage.removeItem('usuario_erp'); }
  }, [usuarioLogado]);

  useEffect(() => {
    if (tarefaAberta) {
      axios.get(`${API_URL}/tarefas/${tarefaAberta.id}/comentarios/`)
        .then(res => setComentarios(res.data || []));
    }
  }, [tarefaAberta]);

  useEffect(() => { fimDoChatRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatGlobal]);

  const baixarArquivo = async (urlOriginal) => {
    try {
      const response = await fetch(`${API_URL}/${urlOriginal}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', urlOriginal.split('/').pop());
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) { window.open(`${API_URL}/${urlOriginal}`, '_blank'); }
  };

  const ehImagem = (url) => /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(url);

  // 4. AÇÕES
  const criarDemanda = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    const tit = novo.setor === 'Financeiro' && novo.tipo_financeiro 
      ? `[${novo.tipo_financeiro.toUpperCase()}] ${novo.titulo}` 
      : novo.titulo;
    
    fd.append('titulo', tit);
    fd.append('setor_destino', novo.setor);
    fd.append('descricao', `PRAZO:${novo.prazo}h\nLINK_CHAT:${novo.link_chat || 'N/A'}\n\nINFO:${novo.desc}`);
    fd.append('responsavel', usuarioLogado.nome);
    fd.append('setor_origem', usuarioLogado.setor);
    fd.append('link_flip', novo.link_flip || '');
    
    await axios.post(`${API_URL}/tarefas/`, fd);
    setNovo({ titulo: '', setor: '', desc: '', link_flip: '', link_chat: '', tipo_financeiro: '', prazo: '24' });
    carregarDados();
  };

  const mudarStatus = async (id, status, e) => {
    e.stopPropagation();
    await axios.patch(`${API_URL}/tarefas/${id}?novo_status=${status}`);
    carregarDados();
  };

  const enviarMsgGlobal = async (e) => {
    e.preventDefault();
    if (!novaMsgGlobal.trim()) return;
    const fd = new FormData();
    fd.append('remetente', usuarioLogado.nome);
    fd.append('setor', usuarioLogado.setor);
    fd.append('texto', novaMsgGlobal);
    await axios.post(`${API_URL}/chat/`, fd);
    setNovaMsgGlobal('');
  };

  const enviarComentario = async (e) => {
    e.preventDefault();
    if (!novoComentario.trim() && !arquivoComentario) return;
    const fd = new FormData();
    fd.append('autor', usuarioLogado.nome);
    fd.append('texto', novoComentario || "Arquivo anexado");
    if (arquivoComentario) fd.append('arquivo', arquivoComentario);

    await axios.post(`${API_URL}/tarefas/${tarefaAberta.id}/comentarios/`, fd);
    setNovoComentario('');
    setArquivoComentario(null);
    axios.get(`${API_URL}/tarefas/${tarefaAberta.id}/comentarios/`).then(res => setComentarios(res.data || []));
  };

  // ==================================================================================
  // LÓGICA DE SEGURANÇA: FILTRAGEM DOS CARDS POR SETOR
  // ==================================================================================
  const tarefasFiltradas = tarefas.filter(t => {
    if (!usuarioLogado) return false;
    const setorUsuario = usuarioLogado.setor;

    // REGRA 1: Se for ADMIN, aplica o filtro selecionado no dropdown
    if (setorUsuario.toLowerCase() === 'admin') {
      return setorAtivo === 'Todos' ? true : t.setor_destino === setorAtivo;
    }

    // REGRA 2: Para outros setores, SÓ MOSTRA o que foi destinado a eles
    return t.setor_destino === setorUsuario;
  });
  // ==================================================================================


  // 5. RENDERIZAÇÃO LOGIN
  if (!usuarioLogado) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)', fontFamily: 'sans-serif' }}>
        <form onSubmit={async (e) => { e.preventDefault(); try { const r = await axios.post(`${API_URL}/login/?login_user=${formLogin.login}&senha_user=${formLogin.senha}`); setUsuarioLogado(r.data); } catch { alert("Login Inválido!"); } }} style={{ backgroundColor: 'var(--card-bg)', padding: '50px', borderRadius: '24px', border: '1px solid var(--border-color)', width: '380px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}><Lock color="var(--accent-color)" size={40} /><h2 style={{ color: 'var(--text-color)' }}>Acesso ERP</h2></div>
          <input placeholder="Login" value={formLogin.login} onChange={e => setFormLogin({...formLogin, login: e.target.value})} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '15px', borderRadius: '12px', width: '100%', marginBottom: '15px', outline: 'none' }} />
          <input type="password" placeholder="Senha" value={formLogin.senha} onChange={e => setFormLogin({...formLogin, senha: e.target.value})} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '15px', borderRadius: '12px', width: '100%', marginBottom: '25px', outline: 'none' }} />
          <button type="submit" style={{ background: 'var(--accent-color)', border: 'none', color: '#fff', padding: '15px', borderRadius: '12px', width: '100%', fontWeight: 'bold', cursor: 'pointer' }}>ENTRAR</button>
        </form>
      </div>
    );
  }

  // RENDERIZAÇÃO DO SISTEMA
  return (
    <div style={{ display: 'flex', backgroundColor: 'var(--bg-color)', height: '100vh', width: '100vw', color: 'var(--text-color)', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '260px', backgroundColor: 'var(--header-bg)', borderRight: '1px solid var(--border-color)', padding: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h2 style={{ color: 'var(--accent-color)', fontSize: '22px', fontWeight: '800', marginBottom: '10px' }}>Orbit ERP</h2>
        <button onClick={() => setDarkMode(!darkMode)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '8px', borderRadius: '10px', cursor: 'pointer', marginBottom: '15px' }}>
          {darkMode ? <Sun size={16} /> : <Moon size={16} />} {darkMode ? 'Claro' : 'Escuro'}
        </button>
        <div style={{ background: 'var(--card-bg)', padding: '15px', borderRadius: '15px', border: '1px solid var(--border-color)' }}>
          <h3 style={{ margin: 0, fontSize: '14px' }}>{usuarioLogado.nome}</h3>
          <span style={{ fontSize: '11px', color: 'var(--accent-color)' }}>{usuarioLogado.setor.toUpperCase()}</span>
        </div>
        <button onClick={() => setAbaAtiva('kanban')} style={{ textAlign: 'left', padding: '12px', borderRadius: '12px', background: abaAtiva === 'kanban' ? 'var(--border-color)' : 'transparent', color: 'var(--text-color)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LayoutDashboard size={18}/> Kanban
        </button>
        {usuarioLogado?.setor?.toLowerCase() === 'admin' && (
          <button onClick={() => setAbaAtiva('admin')} style={{ textAlign: 'left', padding: '12px', borderRadius: '12px', background: abaAtiva === 'admin' ? 'var(--border-color)' : 'transparent', color: 'var(--text-color)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={18}/> Admin
          </button>
        )}
        <button onClick={() => { localStorage.removeItem('usuario_erp'); setUsuarioLogado(null); }} style={{ background: '#e74c3c', border: 'none', padding: '12px', borderRadius: '12px', color: '#fff', marginTop: 'auto', cursor: 'pointer' }}>SAIR</button>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        {abaAtiva === 'admin' ? <AdminPanel /> : (
          <>
            {/* CABEÇALHO COM FILTRO (SÓ APARECE PARA ADMIN) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '28px', margin: 0 }}>Painel de Demandas</h1>
                {usuarioLogado.setor.toLowerCase() === 'admin' && (
                    <select value={setorAtivo} onChange={(e) => setSetorAtivo(e.target.value)} style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)', fontWeight: '500', outline: 'none', cursor: 'pointer' }}>
                        <option value="Todos">Visualizar: Todos</option>
                        {setores.map(s => <option key={s} value={s}>Visualizar: {s}</option>)}
                    </select>
                )}
            </div>
            
            {/* FORMULÁRIO DE LANÇAMENTO (TRAVADO PARA FINANCEIRO) */}
            {usuarioLogado?.setor?.toLowerCase() !== 'financeiro' && (
              <form onSubmit={criarDemanda} style={{ backgroundColor: 'var(--card-bg)', padding: '20px', borderRadius: '15px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input placeholder="Título" value={novo.titulo} onChange={e => setNovo({...novo, titulo: e.target.value})} style={{ flex: 2, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px', borderRadius: '8px' }} required />
                  <select value={novo.setor} onChange={e => setNovo({...novo, setor: e.target.value})} style={{ flex: 1, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px' }} required>
                    <option value="">Setor Destino...</option>{setores.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={novo.prazo} onChange={e => setNovo({...novo, prazo: e.target.value})} style={{ flex: 1, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--accent-color)', borderRadius: '8px' }}>
                    <option value="24">24h</option><option value="48">48h</option><option value="72">72h</option>
                  </select>
                </div>
                {novo.setor === 'Financeiro' && (
                  <select value={novo.tipo_financeiro} onChange={e => setNovo({...novo, tipo_financeiro: e.target.value})} style={{ background: 'var(--bg-color)', border: '1px solid #00b894', color: 'var(--text-color)', padding: '10px', borderRadius: '8px' }} required>
                    <option value="">Tipo de Reembolso...</option>{tiposFinanceiro.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input placeholder="Link Flip Milhas" value={novo.link_flip} onChange={e => setNovo({...novo, link_flip: e.target.value})} style={{ flex: 1, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--accent-color)', padding: '10px', borderRadius: '8px' }} />
                  <input placeholder="Link Chat Cliente" value={novo.link_chat} onChange={e => setNovo({...novo, link_chat: e.target.value})} style={{ flex: 1, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: '#a29bfe', padding: '10px', borderRadius: '8px' }} />
                </div>
                <textarea placeholder="Descrição..." value={novo.desc} onChange={e => setNovo({...novo, desc: e.target.value})} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px', borderRadius: '8px', height: '60px' }} />
                <button type="submit" style={{ background: 'var(--accent-color)', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', color: '#fff', cursor: 'pointer' }}>LANÇAR</button>
              </form>
            )}

            {/* KANBAN BLINDADO (USA tarefasFiltradas) */}
            <div style={{ display: 'flex', gap: '15px' }}>
              {["todo", "doing", "done"].map(status => (
                <div key={status} style={{ flex: 1, background: 'var(--card-bg)', borderRadius: '12px', padding: '15px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ color: '#636e72', marginBottom: '10px' }}>
                    {status === 'todo' ? 'PENDENTE' : status === 'doing' ? 'VERIFICANDO' : 'FINALIZADO'}
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* AQUI ESTÁ A MÁGICA: Usamos tarefasFiltradas em vez de tarefas */}
                    {tarefasFiltradas.filter(t => t.status === status).map(t => (
                      <div key={t.id} onClick={() => setTarefaAberta(t)} style={{ background: 'var(--header-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', cursor: 'pointer', ...obterEstiloSLA(t.descricao) }}>
                        <strong style={{ fontSize: '13px', color: 'var(--text-color)' }}>{t.titulo}</strong>
                        <div style={{ fontSize: '10px', color: '#636e72', marginTop: '5px' }}>Por: {t.responsavel}</div>
                        {status !== 'done' && (
                          <button onClick={e => mudarStatus(t.id, status === 'todo' ? 'doing' : 'done', e)} style={{ width: '100%', marginTop: '10px', background: '#00b894', color: '#fff', border: 'none', padding: '5px', borderRadius: '5px', fontSize: '10px', cursor: 'pointer' }}>AVANÇAR</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* CHAT LATERAL */}
      <div style={{ width: '300px', backgroundColor: 'var(--header-bg)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        
        {/* LISTA DE PRESENÇA (EQUIPE) */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
          <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--accent-color)"/> Equipe Flip
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
            {listaUsuarios.map(u => {
              // LÓGICA DE STATUS:
              // Se o usuário for você, está sempre online.
              // Para os outros, a lógica final virá do banco (V2).
              // Por enquanto, vamos deixar o seu verde e os outros cinza/vermelho para teste.
              const isMe = u.nome === usuarioLogado.nome;
              
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: isMe ? '#00b894' : '#ff7675',
                    boxShadow: isMe ? '0 0 5px #00b894' : '0 0 5px #ff7675'
                  }}></div>
                  <span style={{ color: 'var(--text-color)', fontWeight: isMe ? 'bold' : 'normal', opacity: isMe ? 1 : 0.7 }}>
                    {u.nome} {isMe && "(Você)"}
                  </span>
                  <small style={{ fontSize: '9px', color: '#636e72', marginLeft: 'auto' }}>{u.setor}</small>
                </div>
              );
            })}
          </div>
        </div>

        {/* ÁREA DE MENSAGENS */}
        <div style={{ flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {chatGlobal.map(m => (
            <div key={m.id} style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              padding: '8px',
              borderRadius: '8px',
              alignSelf: m.remetente === usuarioLogado.nome ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
            }}>
              <small style={{ color: 'var(--accent-color)', fontWeight: 'bold', display: 'block' }}>{m.remetente}</small>
              <div style={{ fontSize: '12px', color: 'var(--text-color)', marginTop: '2px' }}>{m.texto}</div>
            </div>
          ))}
          <div ref={fimDoChatRef} />
        </div>

        {/* INPUT DE MENSAGEM */}
        <form onSubmit={enviarMsgGlobal} style={{ padding: '15px', display: 'flex', gap: '5px', background: 'var(--card-bg)', borderTop: '1px solid var(--border-color)' }}>
          <input
            placeholder="Conversar com a equipe..."
            value={novaMsgGlobal}
            onChange={e => setNovaMsgGlobal(e.target.value)}
            style={{ flex: 1, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px', borderRadius: '8px', outline: 'none', fontSize: '13px' }}
          />
          <button type="submit" style={{ background: 'var(--accent-color)', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Send size={16}/>
          </button>
        </form>
      </div>

      {/* MODAL / POPUP DE DETALHES */}
      {tarefaAberta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--card-bg)', borderRadius: '25px', width: '950px', height: '80vh', border: '1px solid var(--border-color)', display: 'flex', overflow: 'hidden' }}>
            
            <div style={{ flex: 1, padding: '35px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ color: 'var(--accent-color)', margin: 0 }}>Solicitação {tarefaAberta.id}</h2>
                <X onClick={() => setTarefaAberta(null)} cursor="pointer" size={24} color="var(--text-color)"/>
              </div>
              <h3 style={{ color: 'var(--text-color)', margin: '20px 0' }}>{tarefaAberta.titulo}</h3>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                {tarefaAberta.link_flip && (
                  <a href={tarefaAberta.link_flip} target="_blank" rel="noreferrer" style={{ background: 'var(--accent-color)', color: '#fff', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block', fontWeight: 'bold', fontSize: '12px' }}>Is VER NO FLIP MILHAS</a>
                )}
                {tarefaAberta.descricao.includes("LINK_CHAT:") && tarefaAberta.descricao.split("LINK_CHAT:")[1].split('\n')[0] !== 'N/A' && (
                  <a href={tarefaAberta.descricao.split("LINK_CHAT:")[1].split('\n')[0]} target="_blank" rel="noreferrer" style={{ background: '#a29bfe', color: '#fff', padding: '10px 20px', borderRadius: '8px', textDecoration: 'none', display: 'inline-block', fontWeight: 'bold', fontSize: '12px' }}>CHAT CLIENTE</a>
                )}
              </div>
              <div style={{ background: 'var(--bg-color)', padding: '20px', borderRadius: '15px', color: 'var(--text-color)', minHeight: '150px', border: '1px solid var(--border-color)', whiteSpace: 'pre-wrap' }}>
                <strong style={{ color: 'var(--accent-color)' }}>DETALHES DA DEMANDA:</strong><br/><br/>
                {tarefaAberta.descricao.includes("INFO:") ? tarefaAberta.descricao.split("INFO:")[1] : tarefaAberta.descricao}
              </div>
            </div>

            <div style={{ width: '380px', background: 'var(--bg-color)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-color)', fontWeight: 'bold' }}>Histórico e Anexos</div>
              <div style={{ flex: 1, padding: '15px', overflowY: 'auto' }}>
                {comentarios.map(c => (
                  <div key={c.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', padding: '12px', borderRadius: '12px', marginBottom: '12px' }}>
                    <small style={{ color: 'var(--accent-color)', fontWeight: 'bold' }}>{c.autor}:</small>
                    <div style={{ fontSize: '13px', color: 'var(--text-color)', marginTop: '5px' }}>{c.texto}</div>
                    {c.arquivo && (
                        <div style={{ background: 'var(--bg-color)', borderRadius: '8px', padding: '10px', marginTop: '10px', border: '1px solid var(--border-color)' }}>
                            {ehImagem(c.arquivo) ? (<img src={`${API_URL}/${c.arquivo}`} style={{ width: '100%', borderRadius: '5px', marginBottom: '10px' }} alt="Anexo" />) : (<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px', color: 'var(--text-color)' }}><FileText size={20} /> <span style={{fontSize: '11px'}}>Documento</span></div>)}
                            <button onClick={() => baixarArquivo(c.arquivo)} style={{ width: '100%', background: '#00b894', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>BAIXAR ANEXO</button>
                        </div>
                    )}
                  </div>
                ))}
              </div>
              <form onSubmit={enviarComentario} style={{ padding: '15px', background: 'var(--card-bg)', display: 'flex', gap: '8px', borderTop: '1px solid var(--border-color)' }}>
                <label style={{ cursor: 'pointer', background: 'var(--bg-color)', border: '1px solid var(--border-color)', padding: '10px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}>
                    <Paperclip size={18} color={arquivoComentario ? "#00b894" : "var(--text-color)"}/>
                    <input type="file" onChange={e => setArquivoComentario(e.target.files[0])} style={{ display: 'none' }} />
                </label>
                <input placeholder="Responder..." value={novoComentario} onChange={e => setNovoComentario(e.target.value)} style={{ flex: 1, background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', padding: '10px', borderRadius: '8px', outline: 'none' }} />
                <button type="submit" style={{ background: 'var(--accent-color)', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}><Send size={18}/></button>
              </form>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default App;