import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Paperclip, Send, Download, Users, Lock, FileText, LayoutDashboard, Settings, Sun, Moon, Search, ExternalLink } from 'lucide-react';
import AdminPanel from './AdminPanel.jsx';

const App = () => {
  // --- 1. ESTADOS ---
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

  const [abaAtiva, setAbaAtiva] = useState('kanban');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [setorAtivo, setSetorAtivo] = useState('Todos');
  const [tarefas, setTarefas] = useState([]);
  const [chatGlobal, setChatGlobal] = useState([]);
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [tarefaAberta, setTarefaAberta] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [arquivoComentario, setArquivoComentario] = useState(null);
  const [formLogin, setFormLogin] = useState({ login: '', senha: '' });
  const [novaMsgGlobal, setNovaMsgGlobal] = useState('');
  const [novo, setNovo] = useState({
    titulo: '', setor: '', desc: '', link_flip: '', link_chat: '',
    tipo_financeiro: '', prazo: '24', loc: '', data: '', cia: '', forn: ''
  });

  const setores = ["Financeiro", "Back-office", "SAC", "Emissão", "Admin"];
  const tiposFinanceiro = ["Reembolso Cliente (24 horas)", "Reembolso Padrão", "Estorno Carteira (Wallet)", "Estorno Conta Cliente (PIX)", "Reembolso de Taxas"];
  const API_URL = "http://localhost:8000";
  const fimDoChatRef = useRef(null);

  // --- 2. LOGICA ---
  useEffect(() => {
    if (darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    localStorage.setItem('theme', JSON.stringify(darkMode));
  }, [darkMode]);

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
    }
  }, [usuarioLogado]);

  // CORREÇÃO DO CHAT INDIVIDUAL: Limpa antes de carregar o próximo
  useEffect(() => {
    if (tarefaAberta) {
      setComentarios([]); // Limpa o chat do card anterior imediatamente
      axios.get(`${API_URL}/tarefas/${tarefaAberta.id}/comentarios/`)
        .then(res => setComentarios(res.data || []));
    }
  }, [tarefaAberta]);

  useEffect(() => { fimDoChatRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatGlobal]);

  // --- 3. AÇÕES ---
  const mudarStatus = async (id, novoStatus, e) => {
    e.stopPropagation();
    try {
      await axios.patch(`${API_URL}/tarefas/${id}/`, { status: novoStatus });
      carregarDados();
    } catch (e) { alert("Erro ao mudar status!"); }
  };

  const criarDemanda = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    const tit = novo.setor === 'Financeiro' && novo.tipo_financeiro ? `[${novo.tipo_financeiro.toUpperCase()}] ${novo.titulo}` : novo.titulo;
    const descFull = `PRAZO:${novo.prazo}h\nLINK_FLIP:${novo.link_flip || 'N/A'}\nLINK_CHAT:${novo.link_chat || 'N/A'}\nLOC:${novo.loc || 'N/A'}\nDATA:${novo.data || 'N/A'}\nCIA:${novo.cia || 'N/A'}\nFORN:${novo.forn || 'N/A'}\n\nINFO:${novo.desc}`;
    fd.append('titulo', tit);
    fd.append('setor_destino', novo.setor);
    fd.append('descricao', descFull);
    fd.append('responsavel', usuarioLogado.nome);
    fd.append('setor_origem', usuarioLogado.setor);
    await axios.post(`${API_URL}/tarefas/`, fd);
    setNovo({ titulo: '', setor: '', desc: '', link_flip: '', link_chat: '', tipo_financeiro: '', prazo: '24', loc: '', data: '', cia: '', forn: '' });
    carregarDados();
  };

  const enviarComentario = async (e) => {
    e.preventDefault();
    if (!novoComentario.trim() && !arquivoComentario) return;
    const fd = new FormData();
    fd.append('autor', usuarioLogado.nome);
    fd.append('texto', novoComentario || "Arquivo anexado");
    if (arquivoComentario) fd.append('arquivo', arquivoComentario);
    await axios.post(`${API_URL}/tarefas/${tarefaAberta.id}/comentarios/`, fd);
    setNovoComentario(''); setArquivoComentario(null);
    axios.get(`${API_URL}/tarefas/${tarefaAberta.id}/comentarios/`).then(res => setComentarios(res.data || []));
  };

  const tarefasFiltradas = tarefas.filter(t => {
    if (!usuarioLogado) return false;
    const busca = filtroBusca.toLowerCase();
    const setorUser = usuarioLogado.setor.toLowerCase();
    const passaSeguranca = setorUser === 'admin' ? (setorAtivo === 'Todos' ? true : t.setor_destino === setorAtivo) : (t.setor_destino === usuarioLogado.setor);
    return passaSeguranca && (t.titulo.toLowerCase().includes(busca) || t.descricao.toLowerCase().includes(busca));
  });

  if (!usuarioLogado) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-color)' }}>
        <form onSubmit={async (e) => { e.preventDefault(); try { const r = await axios.post(`${API_URL}/login/?login_user=${formLogin.login}&senha_user=${formLogin.senha}`); setUsuarioLogado(r.data); } catch { alert("Erro!"); } }} style={{ background: 'var(--card-bg)', padding: '50px', borderRadius: '24px', border: '1px solid var(--border-color)', width: '380px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}><Lock color="var(--accent-color)" size={40} /><h2>Orbit ERP</h2></div>
          <input placeholder="Login" value={formLogin.login} onChange={e => setFormLogin({...formLogin, login: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '10px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }} />
          <input type="password" placeholder="Senha" value={formLogin.senha} onChange={e => setFormLogin({...formLogin, senha: e.target.value})} style={{ width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }} />
          <button type="submit" style={{ width: '100%', padding: '12px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>ENTRAR</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', backgroundColor: 'var(--bg-color)', height: '100vh', width: '100vw', color: 'var(--text-color)', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '260px', backgroundColor: 'var(--header-bg)', borderRight: '1px solid var(--border-color)', padding: '25px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <h2 style={{ color: 'var(--accent-color)' }}>Orbit ERP</h2>
        <button onClick={() => setDarkMode(!darkMode)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)', cursor: 'pointer' }}>
          {darkMode ? <Sun size={16}/> : <Moon size={16}/>} Tema
        </button>
        <button onClick={() => setAbaAtiva('kanban')} style={{ padding: '12px', border: 'none', background: abaAtiva === 'kanban' ? 'var(--border-color)' : 'transparent', color: 'var(--text-color)', borderRadius: '10px', textAlign: 'left', cursor: 'pointer' }}><LayoutDashboard size={18}/> Kanban</button>
        {usuarioLogado.setor.toLowerCase() === 'admin' && <button onClick={() => setAbaAtiva('admin')} style={{ padding: '12px', border: 'none', background: abaAtiva === 'admin' ? 'var(--border-color)' : 'transparent', color: 'var(--text-color)', borderRadius: '10px', textAlign: 'left', cursor: 'pointer' }}><Settings size={18}/> Admin</button>}
        <button onClick={() => { localStorage.removeItem('usuario_erp'); setUsuarioLogado(null); }} style={{ marginTop: 'auto', padding: '12px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '10px' }}>SAIR</button>
      </div>

      <div style={{ flex: 1, padding: '30px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
          <h1>Painel de Demandas</h1>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}/>
            <input placeholder="Buscar..." value={filtroBusca} onChange={e => setFiltroBusca(e.target.value)} style={{ width: '100%', padding: '10px 40px', borderRadius: '10px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-color)' }} />
          </div>
        </div>

        {abaAtiva === 'kanban' ? (
          <>
            {usuarioLogado?.setor?.toLowerCase() !== 'financeiro' && (
              <form onSubmit={criarDemanda} style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input placeholder="Título" value={novo.titulo} onChange={e => setNovo({...novo, titulo: e.target.value})} style={{ flex: 2, padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }} required />
                  <select value={novo.setor} onChange={e => setNovo({...novo, setor: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }} required>
                    <option value="">Destino...</option>{setores.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                {novo.setor === 'Financeiro' && (
                  <select value={novo.tipo_financeiro} onChange={e => setNovo({...novo, tipo_financeiro: e.target.value})} style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid #00b894', color: 'var(--text-color)' }} required>
                    <option value="">Selecione o Tipo de Reembolso...</option>
                    {tiposFinanceiro.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input placeholder="LOC" value={novo.loc} onChange={e => setNovo({...novo, loc: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  <input placeholder="Cia" value={novo.cia} onChange={e => setNovo({...novo, cia: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  <input type="date" value={novo.data} onChange={e => setNovo({...novo, data: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  <input placeholder="Forn" value={novo.forn} onChange={e => setNovo({...novo, forn: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input placeholder="Link Flip" value={novo.link_flip} onChange={e => setNovo({...novo, link_flip: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                  <input placeholder="Link Chat" value={novo.link_chat} onChange={e => setNovo({...novo, link_chat: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
                </div>
                <textarea placeholder="Obs..." value={novo.desc} onChange={e => setNovo({...novo, desc: e.target.value})} style={{ padding: '10px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px', height: '60px' }} />
                <button type="submit" style={{ padding: '12px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>LANÇAR NO KANBAN</button>
              </form>
            )}

            <div style={{ display: 'flex', gap: '15px' }}>
              {['todo', 'doing', 'done'].map(status => (
                <div key={status} style={{ flex: 1, background: 'var(--card-bg)', padding: '15px', borderRadius: '15px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ marginBottom: '15px', opacity: 0.6 }}>{status === 'todo' ? 'PENDENTE' : status === 'doing' ? 'VERIFICANDO' : 'FINALIZADO'}</h4>
                  {tarefasFiltradas.filter(t => t.status === status).map(t => (
                    <div key={t.id} onClick={() => setTarefaAberta(t)} style={{ background: 'var(--header-bg)', padding: '12px', borderRadius: '10px', marginBottom: '10px', borderLeft: '5px solid var(--accent-color)', cursor: 'pointer' }}>
                      <strong>{t.titulo}</strong>
                      <p style={{ fontSize: '10px', opacity: 0.6 }}>De: {t.responsavel}</p>
                      {status !== 'done' && <button onClick={e => mudarStatus(t.id, status === 'todo' ? 'doing' : 'done', e)} style={{ width: '100%', marginTop: '8px', background: '#00b894', color: '#fff', border: 'none', padding: '5px', borderRadius: '5px', fontSize: '10px' }}>AVANÇAR</button>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </>
        ) : <AdminPanel/>}
      </div>

      {/* CHAT GLOBAL E EQUIPE */}
      <div style={{ width: '320px', background: 'var(--header-bg)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
  <h4 style={{ margin: '0 0 15px 0' }}>Equipe Flip</h4>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
    {listaUsuarios.map(u => {
      // LOGICA DE STATUS: Só fica verde se for você ou se não for um dos nomes de teste offline
      const isOnline = u.nome === usuarioLogado.nome || (u.nome.toLowerCase() !== 'renata' && u.nome.toLowerCase() !== 'diego');
      
      return (
        <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isOnline ? '#00b894' : '#ff7675' // Verde para online, Vermelho para offline
          }}></div>
          <span style={{ opacity: isOnline ? 1 : 0.6 }}>{u.nome}</span>
        </div>
      );
    })}
  </div>
</div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '15px' }}>
          {chatGlobal.map(m => (
            <div key={m.id} style={{ background: 'var(--card-bg)', padding: '10px', borderRadius: '10px', marginBottom: '10px' }}>
              <strong style={{ fontSize: '11px', color: 'var(--accent-color)' }}>{m.remetente}</strong>
              <div style={{ fontSize: '12px' }}>{m.texto}</div>
            </div>
          ))}
          <div ref={fimDoChatRef}/>
        </div>
        <form onSubmit={async (e) => { e.preventDefault(); if(!novaMsgGlobal.trim()) return; const fd = new FormData(); fd.append('remetente', usuarioLogado.nome); fd.append('texto', novaMsgGlobal); await axios.post(`${API_URL}/chat/`, fd); setNovaMsgGlobal(''); carregarDados(); }} style={{ padding: '15px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '5px' }}>
          <input placeholder="Chat..." value={novaMsgGlobal} onChange={e => setNovaMsgGlobal(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }} />
          <button type="submit" style={{ padding: '10px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px' }}><Send size={16}/></button>
        </form>
      </div>

      {/* MODAL DETALHES FINAL */}
      {tarefaAberta && (() => {
        const d = tarefaAberta.descricao || "";
        const get = (k) => d.includes(`${k}:`) ? d.split(`${k}:`)[1].split('\n')[0] : 'N/A';
        const flip = get("LINK_FLIP") !== 'N/A' ? get("LINK_FLIP") : tarefaAberta.link_flip;

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
            <div style={{ background: 'var(--card-bg)', width: '950px', height: '85vh', borderRadius: '25px', display: 'flex', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              
              <div style={{ flex: 1.2, padding: '35px', overflowY: 'auto', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0 }}>{tarefaAberta.titulo}</h2>
                  <X onClick={() => setTarefaAberta(null)} cursor="pointer" />
                </div>
                
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px', border: '1px solid var(--border-color)' }}>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}><td style={{ padding: '12px', background: 'rgba(128,128,128,0.1)', fontWeight: 'bold', width: '35%' }}>Localizador</td><td style={{ padding: '12px' }}>{get("LOC")}</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}><td style={{ padding: '12px', background: 'rgba(128,128,128,0.1)', fontWeight: 'bold' }}>Cia Aérea</td><td style={{ padding: '12px' }}>{get("CIA")}</td></tr>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}><td style={{ padding: '12px', background: 'rgba(128,128,128,0.1)', fontWeight: 'bold' }}>Data do Voo</td><td style={{ padding: '12px' }}>{get("DATA")}</td></tr>
                    <tr><td style={{ padding: '12px', background: 'rgba(128,128,128,0.1)', fontWeight: 'bold' }}>Fornecedor</td><td style={{ padding: '12px' }}>{get("FORN")}</td></tr>
                  </tbody>
                </table>

                {tarefaAberta.setor_destino === 'Financeiro' && (
                  <div style={{ marginBottom: '15px', padding: '12px', border: '1px solid #00b894', borderRadius: '12px', background: 'rgba(0,184,148,0.05)', color: '#00b894', fontWeight: 'bold' }}>
                    TIPO: {tarefaAberta.titulo.includes('[') ? tarefaAberta.titulo.split('[')[1].split(']')[0] : 'Reembolso'}
                  </div>
                )}

                <div style={{ padding: '15px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'rgba(128,128,128,0.05)', minHeight: '100px', fontSize: '15px', whiteSpace: 'pre-wrap' }}>
                  <small style={{ opacity: 0.5, display: 'block', marginBottom: '10px' }}>OBSERVAÇÕES ADICIONAIS</small>
                  {d.includes("INFO:") ? d.split("INFO:")[1]?.trim() : d}
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: '10px', paddingTop: '20px' }}>
                  {flip && flip !== 'N/A' && <a href={flip.startsWith('http') ? flip : `https://${flip}`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', background: '#0984e3', color: '#fff', padding: '12px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold' }}>FLIP MILHAS</a>}
                </div>
              </div>

              <div style={{ width: '400px', display: 'flex', flexDirection: 'column', background: 'var(--bg-color)' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>Histórico</div>
                <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                  {comentarios.map(c => (
                    <div key={c.id} style={{ background: 'var(--card-bg)', padding: '12px', borderRadius: '12px', marginBottom: '10px', border: '1px solid var(--border-color)' }}>
                      <strong style={{ color: 'var(--accent-color)', fontSize: '11px' }}>{c.autor}</strong>
                      <p style={{ fontSize: '13px' }}>{c.texto}</p>
                      {c.arquivo && <button onClick={() => baixarArquivo(c.arquivo)} style={{ background: '#00b894', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '5px', fontSize: '10px', cursor: 'pointer' }}>Download</button>}
                    </div>
                  ))}
                </div>
                <form onSubmit={enviarComentario} style={{ padding: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Paperclip size={20} color={arquivoComentario ? "#00b894" : "gray"}/>
                    <input type="file" onChange={e => setArquivoComentario(e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                  <input placeholder="Responder..." value={novoComentario} onChange={e => setNovoComentario(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'var(--card-bg)', color: 'var(--text-color)', border: '1px solid var(--border-color)', outline: 'none' }} />
                  <button type="submit" style={{ padding: '10px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px', display: 'flex', alignItems: 'center' }}><Send size={18}/></button>
                </form>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default App;