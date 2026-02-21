import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Paperclip, Send, Download, Users, Lock, FileText, LayoutDashboard, Settings } from 'lucide-react';
import AdminPanel from './AdminPanel.jsx'; 

const App = () => {
  const [usuarioLogado, setUsuarioLogado] = useState(() => {
    try {
      const salvo = localStorage.getItem('usuario_erp');
      return salvo ? JSON.parse(salvo) : null;
    } catch (e) { return null; }
  });

  const [abaAtiva, setAbaAtiva] = useState('kanban');
  const [formLogin, setFormLogin] = useState({ login: '', senha: '' });
  const [tarefas, setTarefas] = useState([]);
  const [chatGlobal, setChatGlobal] = useState([]);
  const [listaUsuarios, setListaUsuarios] = useState([]);
  const [tarefaAberta, setTarefaAberta] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [novoComentario, setNovoComentario] = useState('');
  const [arquivoComentario, setArquivoComentario] = useState(null);
  const [setorAtivo, setSetorAtivo] = useState('Todos');
  const [novaMsgGlobal, setNovaMsgGlobal] = useState('');
  const [novo, setNovo] = useState({ titulo: '', setor: '', desc: '', link_flip: '', link_chat: '', tipo_financeiro: '', prazo: '24' });

  const setores = ["Financeiro", "Back-office", "SAC", "Emissão", "Admin"];
  const tiposFinanceiro = ["Reembolso Cliente (24 horas)", "Reembolso Padrão", "Estorno Carteira (Wallet)", "Estorno Conta Cliente (PIX)", "Reembolso de Taxas"];
  
  const API_URL = "http://localhost:8000";
  const fimDoChatRef = useRef(null);
  const fimDoHistoricoRef = useRef(null);

  const obterEstiloSLA = (descricao) => {
    if (!descricao) return { borderLeft: '6px solid #636e72' };
    if (descricao.includes("PRAZO:24h")) return { borderLeft: '6px solid #ff7675' };
    if (descricao.includes("PRAZO:48h")) return { borderLeft: '6px solid #fdcb6e' };
    if (descricao.includes("PRAZO:72h")) return { borderLeft: '6px solid #00d2ff' };
    return { borderLeft: '6px solid #636e72' };
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

  useEffect(() => { fimDoChatRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatGlobal]);
  useEffect(() => { fimDoHistoricoRef.current?.scrollIntoView({ behavior: "smooth" }); }, [comentarios]);

  useEffect(() => {
    if (tarefaAberta) {
      axios.get(`${API_URL}/tarefas/${tarefaAberta.id}/comentarios/`).then(res => setComentarios(res.data || []));
    }
  }, [tarefaAberta]);

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

  const mudarStatus = async (id, status, e) => {
    e.stopPropagation();
    await axios.patch(`${API_URL}/tarefas/${id}?novo_status=${status}`);
    carregarDados();
  };

  const enviarComentario = async (e) => {
    e.preventDefault();
    if (!novoComentario.trim() && !arquivoComentario) return;
    const fd = new FormData();
    fd.append('autor', usuarioLogado.nome);
    fd.append('texto', novoComentario || "Arquivo enviado");
    if (arquivoComentario) fd.append('arquivo', arquivoComentario);
    await axios.post(`${API_URL}/tarefas/${tarefaAberta.id}/comentarios/`, fd);
    setNovoComentario(''); setArquivoComentario(null);
    axios.get(`${API_URL}/tarefas/${tarefaAberta.id}/comentarios/`).then(res => setComentarios(res.data || []));
  };

  const criarDemanda = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    const tit = novo.setor === 'Financeiro' && novo.tipo_financeiro ? `[${novo.tipo_financeiro.toUpperCase()}] ${novo.titulo}` : novo.titulo;
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

  const ehImagem = (url) => /\.(jpg|jpeg|png|webp|avif|gif)$/i.test(url);

  if (!usuarioLogado) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#0b0e14', fontFamily: 'sans-serif' }}>
        <form onSubmit={async (e) => { e.preventDefault(); try { const r = await axios.post(`${API_URL}/login/?login_user=${formLogin.login}&senha_user=${formLogin.senha}`); setUsuarioLogado(r.data); } catch { alert("Login Inválido!"); } }} style={{ backgroundColor: '#131720', padding: '50px', borderRadius: '24px', border: '1px solid #2d3436', width: '380px' }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}><Lock color="#00d2ff" size={40} /><h2 style={{ color: '#fff' }}>Acesso ERP</h2></div>
          <input placeholder="Login" value={formLogin.login} onChange={e => setFormLogin({...formLogin, login: e.target.value})} style={{ background: '#0b0e14', border: '1px solid #2d3436', color: '#fff', padding: '15px', borderRadius: '12px', width: '100%', marginBottom: '15px', outline: 'none' }} />
          <input type="password" placeholder="Senha" value={formLogin.senha} onChange={e => setFormLogin({...formLogin, senha: e.target.value})} style={{ background: '#0b0e14', border: '1px solid #2d3436', color: '#fff', padding: '15px', borderRadius: '12px', width: '100%', marginBottom: '25px', outline: 'none' }} />
          <button type="submit" style={{ background: 'linear-gradient(135deg, #00d2ff 0%, #0984e3 100%)', border: 'none', color: '#fff', padding: '15px', borderRadius: '12px', width: '100%', fontWeight: 'bold', cursor: 'pointer' }}>ENTRAR</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', backgroundColor: '#0b0e14', height: '100vh', width: '100vw', color: '#dfe6e9', overflow: 'hidden', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR */}
      <div style={{ width: '260px', backgroundColor: '#131720', borderRight: '1px solid #2d3436', padding: '25px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h2 style={{ color: '#00d2ff', fontSize: '22px', fontWeight: '800', marginBottom: '20px' }}>Orbit ERP</h2>
        
        <div style={{ background: '#1c222d', padding: '15px', borderRadius: '15px', border: '1px solid #2d3436', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', color: '#fff' }}>{usuarioLogado.nome}</h3>
          <span style={{ fontSize: '11px', color: '#00d2ff', fontWeight: 'bold' }}>{usuarioLogado.setor.toUpperCase()}</span>
        </div>

        <button onClick={() => setAbaAtiva('kanban')} style={{ textAlign: 'left', padding: '12px', borderRadius: '12px', width: '100%', background: abaAtiva === 'kanban' ? '#1e272e' : 'transparent', color: abaAtiva === 'kanban' ? '#fff' : '#636e72', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LayoutDashboard size={18}/> Kanban
        </button>

        {usuarioLogado?.setor?.toLowerCase() === 'admin' && (
          <button onClick={() => setAbaAtiva('admin')} style={{ textAlign: 'left', padding: '12px', borderRadius: '12px', width: '100%', background: abaAtiva === 'admin' ? '#1e272e' : 'transparent', color: abaAtiva === 'admin' ? '#fff' : '#636e72', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={18}/> Gestão Equipe
          </button>
        )}

        <hr style={{ border: '0.1px solid #2d3436', margin: '10px 0' }} />

        {abaAtiva === 'kanban' && (
          <>
            <p style={{ fontSize: '11px', color: '#636e72', fontWeight: 'bold' }}>FILTRAR SETOR:</p>
            <div style={{ flex: 1, overflowY: 'auto' }}>
                <button onClick={() => setSetorAtivo('Todos')} style={{ textAlign: 'left', padding: '10px', borderRadius: '10px', width: '100%', background: setorAtivo === 'Todos' ? '#1e272e' : 'transparent', color: setorAtivo === 'Todos' ? '#fff' : '#636e72', border: 'none', cursor: 'pointer' }}>Todos</button>
                {setores.map(s => (
                    <button key={s} onClick={() => setSetorAtivo(s)} style={{ textAlign: 'left', padding: '10px', borderRadius: '10px', width: '100%', background: setorAtivo === s ? '#1e272e' : 'transparent', color: setorAtivo === s ? '#fff' : '#636e72', border: 'none', cursor: 'pointer' }}>{s}</button>
                ))}
            </div>
          </>
        )}
        
        <button onClick={() => { localStorage.removeItem('usuario_erp'); setUsuarioLogado(null); }} style={{ background: '#e74c3c', border: 'none', padding: '12px', borderRadius: '12px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', marginTop: 'auto' }}>SAIR</button>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div style={{ flex: 1, padding: '30px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {abaAtiva === 'admin' ? (
          <AdminPanel />
        ) : (
          <>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '30px' }}>Workflow da Equipe</h1>
            
            {/* LANÇAR DEMANDA */}
            {usuarioLogado.setor.toLowerCase() !== 'financeiro' && (
              <form onSubmit={criarDemanda} style={{ backgroundColor: '#131720', padding: '25px', borderRadius: '20px', border: '1px solid #2d3436', display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input placeholder="Título da Demanda" value={novo.titulo} onChange={e => setNovo({...novo, titulo: e.target.value})} style={{ flex: 2, background: '#0b0e14', border: '1px solid #2d3436', color: '#fff', padding: '12px', borderRadius: '10px' }} required />
                  <select value={novo.setor} onChange={e => setNovo({...novo, setor: e.target.value})} style={{ flex: 1, background: '#0b0e14', border: '1px solid #2d3436', color: '#fff', borderRadius: '10px' }} required>
                    <option value="">Destino...</option>{setores.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select value={novo.prazo} onChange={e => setNovo({...novo, prazo: e.target.value})} style={{ flex: 1, background: '#1c222d', border: '1px solid #2d3436', color: '#00d2ff', borderRadius: '10px' }}>
                    <option value="24">Prazo: 24h</option><option value="48">Prazo: 48h</option><option value="72">Prazo: 72h</option>
                  </select>
                </div>
                {novo.setor === 'Financeiro' && (
                  <select value={novo.tipo_financeiro} onChange={e => setNovo({...novo, tipo_financeiro: e.target.value})} style={{ background: '#0b0e14', border: '1px solid #00b894', color: '#fff', padding: '12px', borderRadius: '10px' }}>
                    <option value="">Tipo de Reembolso...</option>{tiposFinanceiro.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                   <input placeholder="Link Flip Milhas" value={novo.link_flip} onChange={e => setNovo({...novo, link_flip: e.target.value})} style={{ flex: 1, background: '#0b0e14', border: '1px solid #2d3436', color: '#00d2ff', padding: '12px', borderRadius: '10px' }} />
                   <input placeholder="Link Chat Cliente" value={novo.link_chat} onChange={e => setNovo({...novo, link_chat: e.target.value})} style={{ flex: 1, background: '#0b0e14', border: '1px solid #2d3436', color: '#a29bfe', padding: '12px', borderRadius: '10px' }} />
                </div>
                <textarea placeholder="Informações adicionais..." value={novo.desc} onChange={e => setNovo({...novo, desc: e.target.value})} style={{ background: '#0b0e14', border: '1px solid #2d3436', color: '#fff', padding: '12px', borderRadius: '10px', height: '60px' }} />
                <button type="submit" style={{ background: '#00d2ff', border: 'none', padding: '15px', borderRadius: '12px', color: '#0b0e14', fontWeight: 'bold', cursor: 'pointer' }}>LANÇAR NO KANBAN</button>
              </form>
            )}

            {/* COLUNAS */}
            <div style={{ display: 'flex', gap: '20px', flex: 1 }}>
              {["todo", "doing", "done"].map(status => (
                <div key={status} style={{ flex: 1, minWidth: '300px', backgroundColor: 'rgba(19, 23, 32, 0.5)', borderRadius: '15px', padding: '15px', border: '1px solid rgba(45, 52, 54, 0.3)', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '12px', color: '#636e72', marginBottom: '15px', paddingLeft: '10px', borderLeft: status === 'todo' ? '3px solid #ff7675' : status === 'doing' ? '3px solid #fdcb6e' : '3px solid #00b894' }}>
                    {status === 'todo' ? 'PENDENTE' : status === 'doing' ? 'VERIFICANDO' : 'FINALIZADO'}
                  </h3>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {tarefas
                      .filter(t => t.status === status)
                      .filter(t => {
                        if (setorAtivo !== 'Todos') return t.setor_destino === setorAtivo || t.setor_origem === setorAtivo;
                        if (usuarioLogado.setor.toLowerCase() === 'admin') return true;
                        if (usuarioLogado.setor.toLowerCase() === 'financeiro') return t.setor_destino === 'Financeiro';
                        return t.setor_destino === usuarioLogado.setor || t.setor_origem === usuarioLogado.setor;
                      })
                      .map(t => (
                      <div key={t.id} onClick={() => setTarefaAberta(t)} style={{ background: '#1c222d', padding: '15px', borderRadius: '12px', border: '1px solid #2d3436', cursor: 'pointer', ...obterEstiloSLA(t.descricao) }}>
                        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '8px'}}>
                          <small style={{ color: '#00d2ff', fontWeight: 'bold', fontSize: '10px' }}>{t.setor_origem?.toUpperCase()} ➔ {t.setor_destino?.toUpperCase()}</small>
                          <small style={{ fontSize: '9px', color: '#fff', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>
                            {t.descricao.includes("PRAZO:") ? t.descricao.split('PRAZO:')[1].split('\n')[0] : "24h"}
                          </small>
                        </div>
                        <strong style={{ display: 'block', color: '#fff', fontSize: '14px' }}>{t.titulo}</strong>
                        
                        {/* AQUI ESTÁ A LINHA MÁGICA QUE VAI MOSTRAR O NOME */}
                        <div style={{ marginTop: '8px', fontSize: '11px', color: '#b2bec3' }}>
                          Criado por: <span style={{ color: '#fff', fontWeight: 'bold' }}>{t.responsavel || "Desconhecido"}</span>
                        </div>

                        {status !== 'done' && (
                          <button onClick={e => mudarStatus(t.id, status === 'todo' ? 'doing' : 'done', e)} style={{ width: '100%', marginTop: '12px', background: 'rgba(0, 184, 148, 0.1)', border: '1px solid #00b894', color: '#00b894', padding: '6px', borderRadius: '8px', fontSize: '10px', cursor: 'pointer' }}>
                              {status === 'todo' ? 'INICIAR' : 'CONCLUIR'}
                          </button>
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
      <div style={{ width: '320px', backgroundColor: '#131720', borderLeft: '1px solid #2d3436', display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #2d3436' }}>
          <h3 style={{ fontSize: '14px', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={16}/> Equipe Online</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px' }}>
            {listaUsuarios.map(u => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00b894' }}></div>
                <span style={{ fontSize: '13px' }}>{u.nome} <small style={{color: '#636e72'}}>({u.setor})</small></span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, padding: '15px', overflowY: 'auto', background: '#0b0e14', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {chatGlobal.map(m => (
            <div key={m.id} style={{ background: '#1c222d', padding: '10px', borderRadius: '10px', alignSelf: m.remetente === usuarioLogado.nome ? 'flex-end' : 'flex-start', maxWidth: '85%', border: '1px solid #2d3436' }}>
              <small style={{ color: '#00d2ff', fontWeight: 'bold', fontSize: '10px' }}>{m.remetente}</small>
              <div style={{ fontSize: '12px', marginTop: '3px' }}>{m.texto}</div>
            </div>
          ))}
          <div ref={fimDoChatRef} />
        </div>
        <div style={{ padding: '15px', background: '#131720', borderTop: '1px solid #2d3436' }}>
          <form onSubmit={enviarMsgGlobal} style={{ display: 'flex', gap: '5px' }}>
            <input placeholder="Conversar com a equipe..." value={novaMsgGlobal} onChange={e => setNovaMsgGlobal(e.target.value)} style={{ flex: 1, background: '#0b0e14', border: '1px solid #2d3436', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '13px', outline: 'none' }} />
            <button type="submit" style={{ background: '#00d2ff', border: 'none', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}><Send size={16} color="#131720"/></button>
          </form>
        </div>
      </div>

      {/* MODAL DETALHES */}
      {tarefaAberta && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: '#131720', borderRadius: '25px', width: '950px', height: '80vh', border: '1px solid #2d3436', display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '35px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <h2 style={{ color: '#00d2ff' }}>#{tarefaAberta.id}</h2>
                <X onClick={() => setTarefaAberta(null)} cursor="pointer" size={24} />
              </div>
              <h3 style={{ color: '#fff', margin: '15px 0', fontSize: '22px' }}>{tarefaAberta.titulo}</h3>
              
              <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                {tarefaAberta.link_flip && <a href={tarefaAberta.link_flip} target="_blank" rel="noreferrer" style={{ background: '#0984e3', color: '#fff', padding: '8px 15px', borderRadius: '8px', fontSize: '12px', textDecoration: 'none', fontWeight: 'bold' }}>FLIP MILHAS</a>}
                {tarefaAberta.descricao.includes("LINK_CHAT:") && tarefaAberta.descricao.split("LINK_CHAT:")[1].split('\n')[0] !== 'N/A' && (
                  <a href={tarefaAberta.descricao.split("LINK_CHAT:")[1].split('\n')[0]} target="_blank" rel="noreferrer" style={{ background: '#6c5ce7', color: '#fff', padding: '8px 15px', borderRadius: '8px', fontSize: '12px', textDecoration: 'none', fontWeight: 'bold' }}>CHAT CLIENTE</a>
                )}
              </div>

              <div style={{ background: '#0b0e14', padding: '20px', borderRadius: '15px', color: '#b2bec3', minHeight: '150px', whiteSpace: 'pre-wrap', border: '1px solid #2d3436' }}>
                <strong style={{ color: '#00d2ff' }}>DETALHES DA DEMANDA:</strong><br/><br/>
                {tarefaAberta.descricao.includes("INFO:") ? tarefaAberta.descricao.split("INFO:")[1] : tarefaAberta.descricao}
              </div>
            </div>

            {/* HISTÓRICO NO MODAL */}
            <div style={{ width: '380px', background: '#0b0e14', borderLeft: '1px solid #2d3436', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px', borderBottom: '1px solid #2d3436', fontWeight: 'bold' }}>Histórico / Arquivos</div>
              <div style={{ flex: 1, padding: '15px', overflowY: 'auto' }}>
                {comentarios.map(c => (
                  <div key={c.id} style={{ background: '#131720', padding: '12px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #2d3436' }}>
                    <small style={{ color: '#00d2ff', fontWeight: 'bold' }}>{c.autor}:</small>
                    <div style={{ fontSize: '13px', marginTop: '5px' }}>{c.texto}</div>
                    {c.arquivo && (
                        <div style={{ background: '#0b0e14', borderRadius: '8px', padding: '8px', marginTop: '10px' }}>
                            {ehImagem(c.arquivo) ? (
                                <img src={`${API_URL}/${c.arquivo}`} style={{ width: '100%', borderRadius: '5px', marginBottom: '10px' }} />
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}><FileText size={20} /> <span style={{fontSize: '11px'}}>Documento</span></div>
                            )}
                            <button onClick={() => baixarArquivo(c.arquivo)} style={{ width: '100%', background: '#00b894', color: '#0b0e14', border: 'none', padding: '10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>BAIXAR ARQUIVO</button>
                        </div>
                    )}
                  </div>
                ))}
                <div ref={fimDoHistoricoRef} />
              </div>
              <form onSubmit={enviarComentario} style={{ padding: '15px', background: '#131720', display: 'flex', gap: '8px', borderTop: '1px solid #2d3436' }}>
                    <label style={{ cursor: 'pointer', background: '#0b0e14', padding: '10px', borderRadius: '8px' }}>
                        <Paperclip size={18} color={arquivoComentario ? "#00b894" : "#636e72"}/><input type="file" onChange={e => setArquivoComentario(e.target.files[0])} style={{ display: 'none' }} />
                    </label>
                    <input placeholder="Responder..." value={novoComentario} onChange={e => setNovoComentario(e.target.value)} style={{ flex: 1, background: '#0b0e14', border: 'none', color: '#fff', padding: '10px', borderRadius: '8px', outline: 'none' }} />
                    <button type="submit" style={{ background: '#00d2ff', border: 'none', borderRadius: '8px', padding: '10px', cursor: 'pointer' }}><Send size={18}/></button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;