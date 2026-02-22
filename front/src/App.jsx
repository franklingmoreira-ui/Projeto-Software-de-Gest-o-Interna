import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, Paperclip, Send, Download, Lock, LayoutDashboard, Settings, Sun, Moon, Search, ExternalLink } from 'lucide-react';
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
  
  // ESTADO: CONTROLE DE TEMPO AO VIVO PARA O TIMER
  const [currentTime, setCurrentTime] = useState(Date.now());

  // ESTADO: CONTROLADOR DE DADOS DO EMISSOR
  const [dadosEmissao, setDadosEmissao] = useState({ loc: '', cia: '', forn: '', data_ida: '', horario_ida: '', data_volta: '', horario_volta: '' });

  // ESTADO 'NOVO'
  const [novo, setNovo] = useState({
    titulo: '', setor: '', desc: '', link_flip: '', link_chat: '',
    tipo_financeiro: '', tipo_backoffice: '', outro_tipo_back: '', data_limite: '', prazo: '24', loc: '', data: '', data_volta: '', horario_ida: '', horario_volta: '', cia: '', forn: '',
    tipo_voo: 'Somente Ida', origem_destino: '', origem_destino_volta: '', adultos: '1', criancas: '0', bebes: '0',
    passageiros: [{ nome: '', cpf: '', bagagem: 'Não' }]
  });

  const setores = ["Financeiro", "Back-office", "SAC", "Emissão", "Admin"];
  const tiposFinanceiro = ["Reembolso Cliente (24 horas)", "Reembolso Padrão", "Estorno Carteira (Wallet)", "Estorno Conta Cliente (PIX)", "Reembolso de Taxas"];
  const tiposBackOffice = ["Recuperar Taxa No Show", "Correção de Nome", "Laudo Médico", "Atestado de Óbito", "Remarcação", "Outros (Digitar novo tipo...)"];

  const API_URL = "http://localhost:8000";
  const fimDoChatRef = useRef(null);

  // --- 2. LOGICA E EFEITOS ---
  useEffect(() => {
    if (darkMode) document.body.classList.add('dark-mode');
    else document.body.classList.remove('dark-mode');
    localStorage.setItem('theme', JSON.stringify(darkMode));
  }, [darkMode]);

  // RELÓGIO DO TIMER (Atualiza a cada 1 minuto)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  useEffect(() => {
    if (tarefaAberta) {
      setComentarios([]);
      axios.get(`${API_URL}/tarefas/${tarefaAberta.id}/comentarios/`)
        .then(res => setComentarios(res.data || []));

      const d = tarefaAberta.descricao || "";
      const getE = (k) => d.includes(`${k}:`) ? d.split(`${k}:`)[1].split('\n')[0].trim() : 'N/A';
      
      const rawData = getE("DATA");
      const rawHorario = getE("HORARIO");
      const isRound = getE("ORIGEM_DESTINO").includes('| VOLTA:');

      let dIda = '', dVolta = '', hIda = '', hVolta = '';

      if (isRound) {
          if (rawData !== 'N/A' && rawData.includes('|')) {
              dIda = rawData.split('|')[0].replace('IDA:', '').trim();
              dVolta = rawData.split('|')[1].replace('VOLTA:', '').trim();
          }
          if (rawHorario !== 'N/A' && rawHorario.includes('|')) {
              hIda = rawHorario.split('|')[0].replace('IDA:', '').trim();
              hVolta = rawHorario.split('|')[1].replace('VOLTA:', '').trim();
          }
      } else {
          dIda = rawData !== 'N/A' ? rawData.replace('IDA:', '').trim() : '';
          hIda = rawHorario !== 'N/A' ? rawHorario.replace('IDA:', '').trim() : '';
      }

      setDadosEmissao({
        loc: getE("LOC") !== 'N/A' ? getE("LOC") : '',
        cia: getE("CIA") !== 'N/A' ? getE("CIA") : '',
        forn: getE("FORN") !== 'N/A' ? getE("FORN") : '',
        data_ida: dIda,
        horario_ida: hIda,
        data_volta: dVolta,
        horario_volta: hVolta
      });
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

  const atualizarDadosEmissao = async (e) => {
    e.preventDefault();
    let novaDesc = tarefaAberta.descricao || "";
    
    const replaceOrAdd = (desc, key, val) => {
        const regex = new RegExp(`${key}:.*`);
        const newVal = val || 'N/A';
        if (desc.match(regex)) return desc.replace(regex, `${key}:${newVal}`);
        return desc + `\n${key}:${newVal}`;
    };

    const isRound = novaDesc.includes('ORIGEM_DESTINO:') && novaDesc.split('ORIGEM_DESTINO:')[1].split('\n')[0].includes('| VOLTA:');

    let novaData = dadosEmissao.data_ida;
    let novoHorario = dadosEmissao.horario_ida;

    if (isRound) {
        novaData = `IDA: ${dadosEmissao.data_ida || 'N/A'} | VOLTA: ${dadosEmissao.data_volta || 'N/A'}`;
        novoHorario = `IDA: ${dadosEmissao.horario_ida || 'N/A'} | VOLTA: ${dadosEmissao.horario_volta || 'N/A'}`;
    }

    novaDesc = replaceOrAdd(novaDesc, 'LOC', dadosEmissao.loc);
    novaDesc = replaceOrAdd(novaDesc, 'CIA', dadosEmissao.cia);
    novaDesc = replaceOrAdd(novaDesc, 'FORN', dadosEmissao.forn);
    novaDesc = replaceOrAdd(novaDesc, 'DATA', novaData);
    novaDesc = replaceOrAdd(novaDesc, 'HORARIO', novoHorario);

    try {
        await axios.patch(`${API_URL}/tarefas/${tarefaAberta.id}/`, { descricao: novaDesc });
        
        const msgAviso = `✈️ EMISSÃO ATUALIZADA!\n\nLocalizador: ${dadosEmissao.loc || 'N/A'}\nCia Aérea: ${dadosEmissao.cia || 'N/A'}\n\nData: \n${novaData}\n\nHorário: \n${novoHorario}`;
        const fdComentario = new FormData();
        fdComentario.append('autor', `[Aviso do Sistema]`);
        fdComentario.append('texto', msgAviso);
        await axios.post(`${API_URL}/tarefas/${tarefaAberta.id}/comentarios/`, fdComentario);

        setTarefaAberta({ ...tarefaAberta, descricao: novaDesc });
        axios.get(`${API_URL}/tarefas/${tarefaAberta.id}/comentarios/`).then(res => setComentarios(res.data || []));
        carregarDados();
        alert("✈️ Passagem atualizada e solicitante notificado no Histórico!");
    } catch (err) {
        alert("⛔ Erro de servidor. Verifique o backend.");
    }
  };

  const criarDemanda = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    let tipoFinalBack = novo.tipo_backoffice === "Outros (Digitar novo tipo...)" ? novo.outro_tipo_back : novo.tipo_backoffice;

    let tit = novo.titulo;
    if (novo.setor === 'Financeiro' && novo.tipo_financeiro) tit = `[${novo.tipo_financeiro.toUpperCase()}] ${novo.titulo}`;
    if (novo.setor === 'Back-office' && tipoFinalBack) tit = `[${tipoFinalBack.toUpperCase()}] ${novo.titulo}`;
    if (novo.setor === 'Emissão') tit = `[EMISSÃO] ${novo.titulo}`;

    let paxListStr = '';
    let trechoFinal = novo.origem_destino;
    let dataFinal = novo.data || 'N/A';
    
    let horarioFinal = novo.horario_ida || 'N/A';

    if (novo.setor === 'Emissão') {
        const totalPax = (parseInt(novo.adultos)||0) + (parseInt(novo.criancas)||0) + (parseInt(novo.bebes)||0);
        const paxList = (novo.passageiros || []).slice(0, totalPax);
        paxListStr = paxList.map(p => `${p.nome || 'N/A'}::${p.cpf || 'N/A'}::${p.bagagem || 'Não'}`).join('||');
        
        trechoFinal = novo.tipo_voo === 'Ida e Volta' 
            ? `IDA: ${novo.origem_destino} | VOLTA: ${novo.origem_destino_volta}` 
            : novo.origem_destino;
            
        if (novo.tipo_voo === 'Ida e Volta') {
            dataFinal = `IDA: ${novo.data || 'N/A'} | VOLTA: ${novo.data_volta || 'N/A'}`;
            horarioFinal = `IDA: ${novo.horario_ida || 'N/A'} | VOLTA: ${novo.horario_volta || 'N/A'}`;
        }
    }

    const descFull = `PRAZO:${novo.prazo}h\nCRIADO_EM:${new Date().toISOString()}\nDATA_LIMITE:${novo.data_limite || 'N/A'}\nLINK_FLIP:${novo.link_flip || 'N/A'}\nLINK_CHAT:${novo.link_chat || 'N/A'}\nLOC:${novo.loc || 'N/A'}\nDATA:${dataFinal}\nHORARIO:${horarioFinal}\nCIA:${novo.cia || 'N/A'}\nFORN:${novo.forn || 'N/A'}\nORIGEM_DESTINO:${trechoFinal || 'N/A'}\nPAX:${novo.adultos} Adulto, ${novo.criancas} Criança, ${novo.bebes} Bebê\nPAX_LIST:${paxListStr}\n\nINFO:${novo.desc}`;
    
    fd.append('titulo', tit);
    fd.append('setor_destino', novo.setor);
    fd.append('descricao', descFull);
    fd.append('responsavel', usuarioLogado.nome);
    fd.append('setor_origem', usuarioLogado.setor);
    
    await axios.post(`${API_URL}/tarefas/`, fd);
    setNovo({ titulo: '', setor: '', desc: '', link_flip: '', link_chat: '', tipo_financeiro: '', tipo_backoffice: '', outro_tipo_back: '', data_limite: '', prazo: '24', loc: '', data: '', data_volta: '', horario_ida: '', horario_volta: '', cia: '', forn: '', tipo_voo: 'Somente Ida', origem_destino: '', origem_destino_volta: '', adultos: '1', criancas: '0', bebes: '0', passageiros: [{ nome: '', cpf: '', bagagem: 'Não' }] });
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

  const baixarArquivo = (url) => window.open(`${API_URL}/${url}`, '_blank');
  const buscarTexto = (txt) => txt ? txt.toLowerCase().includes(filtroBusca.toLowerCase()) : false;

  const tarefasFiltradas = tarefas.filter(t => {
    if (!usuarioLogado) return false;
    const setorUser = usuarioLogado.setor.toLowerCase();
    const souDestino = t.setor_destino.toLowerCase() === setorUser;
    const souOrigem = t.setor_origem && t.setor_origem.toLowerCase() === setorUser;
    const passaSeguranca = setorUser === 'admin' ? (setorAtivo === 'Todos' ? true : t.setor_destino === setorAtivo) : (souDestino || souOrigem);
    return passaSeguranca && (buscarTexto(t.titulo) || buscarTexto(t.descricao));
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
            <form onSubmit={criarDemanda} style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '15px', display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input placeholder="Título da Demanda" value={novo.titulo} onChange={e => setNovo({...novo, titulo: e.target.value})} style={{ flex: 2, padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }} required />
                <select value={novo.setor} onChange={e => setNovo({...novo, setor: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }} required>
                  <option value="">Destino...</option>{setores.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {novo.setor === 'Financeiro' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select value={novo.tipo_financeiro} onChange={e => setNovo({...novo, tipo_financeiro: e.target.value})} style={{ flex: 2, padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid #00b894', color: 'var(--text-color)' }} required>
                    <option value="">Tipo de Reembolso...</option>
                    {tiposFinanceiro.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={novo.prazo} onChange={e => setNovo({...novo, prazo: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid #00b894', color: 'var(--text-color)' }} required>
                    <option value="24">Prazo: 24 horas</option>
                    <option value="48">Prazo: 48 horas</option>
                    <option value="72">Prazo: 72 horas</option>
                  </select>
                </div>
              )}

              {novo.setor === 'Back-office' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select value={novo.tipo_backoffice} onChange={e => setNovo({...novo, tipo_backoffice: e.target.value})} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid #6c5ce7', color: 'var(--text-color)' }} required>
                      <option value="">Tipo de Processo Back-office...</option>
                      {tiposBackOffice.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-color)', border: '1px solid #6c5ce7', borderRadius: '8px', padding: '0 10px' }}>
                        <span style={{ fontSize: '13px', whiteSpace: 'nowrap', opacity: 0.7 }}>Prazo Tarefa:</span>
                        <input type="date" value={novo.data_limite} onChange={e => setNovo({...novo, data_limite: e.target.value})} style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-color)', padding: '10px 0', outline: 'none' }} required />
                    </div>
                  </div>
                  {novo.tipo_backoffice === "Outros (Digitar novo tipo...)" && (
                    <input placeholder="Descreva o tipo da nova demanda..." value={novo.outro_tipo_back} onChange={e => setNovo({...novo, outro_tipo_back: e.target.value})} style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid #6c5ce7', color: 'var(--text-color)' }} required />
                  )}
                </div>
              )}

              {/* MÓDULO EXCLUSIVO DE EMISSÃO COM SELETOR DE IDA E VOLTA E HORÁRIOS */}
              {novo.setor === 'Emissão' && (() => {
                const totalPax = (parseInt(novo.adultos)||0) + (parseInt(novo.criancas)||0) + (parseInt(novo.bebes)||0);
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select value={novo.tipo_voo} onChange={e => setNovo({...novo, tipo_voo: e.target.value})} style={{ padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid #0984e3', color: 'var(--text-color)' }}>
                      <option value="Somente Ida">✈️ Somente Ida</option>
                      <option value="Ida e Volta">✈️ Ida e Volta</option>
                    </select>

                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input placeholder={novo.tipo_voo === 'Ida e Volta' ? "Trecho IDA (ex: GRU - JFK)" : "Trecho (ex: GRU - JFK)"} value={novo.origem_destino} onChange={e => setNovo({...novo, origem_destino: e.target.value})} style={{ flex: 2, padding: '10px', background: 'var(--bg-color)', border: '1px solid #0984e3', color: 'var(--text-color)', borderRadius: '8px' }} required />
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-color)', border: '1px solid #0984e3', borderRadius: '8px', padding: '0 10px' }}>
                          <span style={{ fontSize: '12px', opacity: 0.7, color: '#0984e3', whiteSpace: 'nowrap' }}>Data Ida:</span>
                          <input type="date" value={novo.data} onChange={e => setNovo({...novo, data: e.target.value})} style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none' }} required />
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-color)', border: '1px solid #0984e3', borderRadius: '8px', padding: '0 10px' }}>
                          <span style={{ fontSize: '12px', opacity: 0.7, color: '#0984e3', whiteSpace: 'nowrap' }}>Horário Ida:</span>
                          <input type="time" value={novo.horario_ida} onChange={e => setNovo({...novo, horario_ida: e.target.value})} style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none' }} />
                      </div>
                    </div>

                    {novo.tipo_voo === 'Ida e Volta' && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <input placeholder="Trecho VOLTA (ex: JFK - GRU)" value={novo.origem_destino_volta} onChange={e => setNovo({...novo, origem_destino_volta: e.target.value})} style={{ flex: 2, padding: '10px', background: 'var(--bg-color)', border: '1px solid #0984e3', color: 'var(--text-color)', borderRadius: '8px' }} required />
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-color)', border: '1px solid #0984e3', borderRadius: '8px', padding: '0 10px' }}>
                              <span style={{ fontSize: '12px', opacity: 0.7, color: '#0984e3', whiteSpace: 'nowrap' }}>Data Volta:</span>
                              <input type="date" value={novo.data_volta} onChange={e => setNovo({...novo, data_volta: e.target.value})} style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none' }} required />
                          </div>
                          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-color)', border: '1px solid #0984e3', borderRadius: '8px', padding: '0 10px' }}>
                              <span style={{ fontSize: '12px', opacity: 0.7, color: '#0984e3', whiteSpace: 'nowrap' }}>Horário Volta:</span>
                              <input type="time" value={novo.horario_volta} onChange={e => setNovo({...novo, horario_volta: e.target.value})} style={{ flex: 1, background: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none' }} />
                          </div>
                        </div>
                    )}
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                      <div style={{ flex: 1, display: 'flex', gap: '5px', alignItems: 'center', background: 'var(--bg-color)', border: '1px solid #0984e3', padding: '5px 10px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '12px', opacity: 0.7 }}>Adultos:</span>
                        <input type="number" min="0" value={novo.adultos} onChange={e => setNovo({...novo, adultos: e.target.value})} style={{ width: '40px', background: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none' }} />
                      </div>
                      <div style={{ flex: 1, display: 'flex', gap: '5px', alignItems: 'center', background: 'var(--bg-color)', border: '1px solid #0984e3', padding: '5px 10px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '12px', opacity: 0.7 }}>Crianças:</span>
                        <input type="number" min="0" value={novo.criancas} onChange={e => setNovo({...novo, criancas: e.target.value})} style={{ width: '40px', background: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none' }} />
                      </div>
                      <div style={{ flex: 1, display: 'flex', gap: '5px', alignItems: 'center', background: 'var(--bg-color)', border: '1px solid #0984e3', padding: '5px 10px', borderRadius: '8px' }}>
                        <span style={{ fontSize: '12px', opacity: 0.7 }}>Bebês:</span>
                        <input type="number" min="0" value={novo.bebes} onChange={e => setNovo({...novo, bebes: e.target.value})} style={{ width: '40px', background: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none' }} />
                      </div>
                    </div>

                    {Array.from({ length: totalPax }).map((_, index) => {
                        const p = (novo.passageiros && novo.passageiros[index]) || { nome: '', cpf: '', bagagem: 'Não' };
                        return (
                            <div key={index} style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'rgba(9,132,227,0.05)', padding: '10px', borderRadius: '8px', border: '1px dashed #0984e3' }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0984e3', width: '20px' }}>{index + 1}.</span>
                                <input placeholder="Nome do Passageiro" value={p.nome} onChange={e => { const newPax = [...(novo.passageiros || [])]; if(!newPax[index]) newPax[index] = {nome:'', cpf:'', bagagem:'Não'}; newPax[index].nome = e.target.value; setNovo({...novo, passageiros: newPax}); }} style={{ flex: 2, padding: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '6px' }} required />
                                <input placeholder="CPF" value={p.cpf} onChange={e => { const newPax = [...(novo.passageiros || [])]; if(!newPax[index]) newPax[index] = {nome:'', cpf:'', bagagem:'Não'}; newPax[index].cpf = e.target.value; setNovo({...novo, passageiros: newPax}); }} style={{ flex: 1.5, padding: '8px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '6px' }} required />
                                <select value={p.bagagem} onChange={e => { const newPax = [...(novo.passageiros || [])]; if(!newPax[index]) newPax[index] = {nome:'', cpf:'', bagagem:'Não'}; newPax[index].bagagem = e.target.value; setNovo({...novo, passageiros: newPax}); }} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)' }}>
                                    <option value="Não">Sem Bag</option>
                                    <option value="Sim">Com Bag</option>
                                </select>
                            </div>
                        );
                    })}
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '10px' }}>
                <input placeholder={novo.setor === 'Emissão' ? "LOC (Se houver)" : "LOC"} value={novo.loc} onChange={e => setNovo({...novo, loc: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px' }} />
                <input placeholder="Cia Aérea" value={novo.cia} onChange={e => setNovo({...novo, cia: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px' }} />
                
                {/* Oculta Data do Voo para Emissão, Back-office E Financeiro */}
                {novo.setor !== 'Emissão' && novo.setor !== 'Back-office' && novo.setor !== 'Financeiro' && (
                    <input type="date" value={novo.data} onChange={e => setNovo({...novo, data: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px' }} />
                )}
                
                <input placeholder="Fornecedor" value={novo.forn} onChange={e => setNovo({...novo, forn: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input placeholder="Link Flip" value={novo.link_flip} onChange={e => setNovo({...novo, link_flip: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px' }} />
                <input placeholder="Link Chat" value={novo.link_chat} onChange={e => setNovo({...novo, link_chat: e.target.value})} style={{ flex: 1, padding: '10px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px' }} />
              </div>
              <textarea placeholder={novo.setor === 'Emissão' ? "Detalhes da emissão ou observações..." : "Informações Extras / Demandas Novas..."} value={novo.desc} onChange={e => setNovo({...novo, desc: e.target.value})} style={{ padding: '10px', background: 'var(--bg-color)', border: '1px solid var(--border-color)', color: 'var(--text-color)', borderRadius: '8px', height: '60px' }} />
              <button type="submit" style={{ padding: '12px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold' }}>LANÇAR NO KANBAN</button>
            </form>

            <div style={{ display: 'flex', gap: '15px' }}>
              {['todo', 'doing', 'done'].map(status => (
                <div key={status} style={{ flex: 1, background: 'var(--card-bg)', padding: '15px', borderRadius: '15px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ marginBottom: '15px', opacity: 0.6 }}>{status === 'todo' ? 'PENDENTE' : status === 'doing' ? 'VERIFICANDO' : 'FINALIZADO'}</h4>
                  {tarefasFiltradas.filter(t => t.status === status).map(t => {
                    const d = t.descricao || "";
                    
                    const dataLim = d.includes("DATA_LIMITE:") ? d.split("DATA_LIMITE:")[1].split('\n')[0].trim() : 'N/A';
                    const prazoCard = d.includes("PRAZO:") ? d.split("PRAZO:")[1].split('\n')[0].trim() : 'N/A';
                    const criadoEm = d.includes("CRIADO_EM:") ? d.split("CRIADO_EM:")[1].split('\n')[0].trim() : null;
                    const diasRest = dataLim !== 'N/A' && dataLim !== '' ? Math.ceil((new Date(dataLim) - new Date()) / (1000 * 60 * 60 * 24)) : null;
                    const enviadaPorMim = t.setor_origem?.toLowerCase() === usuarioLogado.setor.toLowerCase();
                    
                    let timerText = `⏳ PRAZO: ${prazoCard}`;
                    let colorTag = prazoCard.includes('24') ? '#e74c3c' : '#00b894';

                    if (t.setor_destino.toLowerCase() === 'financeiro' && criadoEm && prazoCard !== 'N/A') {
                        const horasPrazo = parseInt(prazoCard.replace(/\D/g, ''));
                        if (!isNaN(horasPrazo)) {
                            const dataCriacao = new Date(criadoEm).getTime();
                            const dataFim = dataCriacao + (horasPrazo * 60 * 60 * 1000);
                            const diff = dataFim - currentTime;

                            if (diff <= 0) {
                                timerText = `🚨 ATRASADO (${horasPrazo}h)`;
                                colorTag = '#e74c3c';
                            } else {
                                const hLeft = Math.floor(diff / (1000 * 60 * 60));
                                const mLeft = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                                timerText = `⏳ RESTA: ${hLeft}h ${mLeft}m (de ${horasPrazo}h)`;
                            }
                        }
                    }

                    return (
                      <div key={t.id} onClick={() => setTarefaAberta(t)} style={{ background: 'var(--header-bg)', padding: '12px', borderRadius: '10px', marginBottom: '10px', borderLeft: '5px solid var(--accent-color)', cursor: 'pointer', opacity: enviadaPorMim && t.setor_destino.toLowerCase() !== usuarioLogado.setor.toLowerCase() ? 0.8 : 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <strong>{t.titulo}</strong>
                            {enviadaPorMim && <span style={{ fontSize: '9px', background: 'rgba(128,128,128,0.2)', padding: '2px 5px', borderRadius: '4px' }}>ENVIADA</span>}
                        </div>
                        <p style={{ fontSize: '10px', opacity: 0.6 }}>Responsável: {t.responsavel}</p>
                        <p style={{ fontSize: '9px', opacity: 0.5 }}>Destino: {t.setor_destino}</p>
                        
                        {t.setor_destino.toLowerCase() === 'financeiro' && prazoCard !== 'N/A' && (
                          <div style={{ fontSize: '10px', marginTop: '5px', padding: '4px', borderRadius: '4px', background: colorTag, color: '#fff', fontWeight: 'bold', display: 'inline-block' }}>
                            {timerText}
                          </div>
                        )}

                        {t.setor_destino.toLowerCase() !== 'financeiro' && dataLim !== 'N/A' && dataLim !== '' && !isNaN(diasRest) && (
                          <div style={{ fontSize: '10px', marginTop: '5px', padding: '4px', borderRadius: '4px', background: diasRest < 0 ? '#ff7675' : '#6c5ce7', color: '#fff', fontWeight: 'bold', display: 'inline-block' }}>
                            LIMITE: {new Date(dataLim).toLocaleDateString('pt-BR')} {diasRest !== null && ` (${diasRest < 0 ? 'ATRASADO' : diasRest + ' dias'})`}
                          </div>
                        )}
                        
                        {status !== 'done' && t.setor_destino.toLowerCase() === usuarioLogado.setor.toLowerCase() && (
                            <button onClick={e => mudarStatus(t.id, status === 'todo' ? 'doing' : 'done', e)} style={{ width: '100%', marginTop: '8px', background: '#00b894', color: '#fff', border: 'none', padding: '5px', borderRadius: '5px', fontSize: '10px' }}>AVANÇAR</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        ) : <AdminPanel/>}
      </div>

      <div style={{ width: '320px', background: 'var(--header-bg)', borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
          <h4 style={{ margin: '0 0 15px 0' }}>Equipe Flip</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {listaUsuarios.map(u => {
              const isOnline = u.nome === usuarioLogado.nome || (u.nome.toLowerCase() !== 'renata' && u.nome.toLowerCase() !== 'diego');
              return (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#00b894' : '#ff7675' }}></div>
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
        <form onSubmit={async (e) => {
          e.preventDefault();
          if(!novaMsgGlobal.trim()) return;
          try {
            const fd = new FormData();
            fd.append('remetente', usuarioLogado.nome);
            fd.append('setor', usuarioLogado.setor);
            fd.append('texto', novaMsgGlobal);
            await axios.post(`${API_URL}/chat/`, fd);
            setNovaMsgGlobal('');
            carregarDados();
          } catch (err) { console.error("Erro Chat:", err); }
        }} style={{ padding: '15px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '5px' }}>
          <input placeholder="Chat..." value={novaMsgGlobal} onChange={e => setNovaMsgGlobal(e.target.value)} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', color: 'var(--text-color)', border: '1px solid var(--border-color)' }} />
          <button type="submit" style={{ padding: '10px', background: 'var(--accent-color)', color: '#fff', border: 'none', borderRadius: '8px' }}><Send size={16}/></button>
        </form>
      </div>

      {tarefaAberta && (() => {
        const d = tarefaAberta.descricao || "";
        const get = (k) => d.includes(`${k}:`) ? d.split(`${k}:`)[1].split('\n')[0].trim() : 'N/A';
        const flip = get("LINK_FLIP") !== 'N/A' ? get("LINK_FLIP") : tarefaAberta.link_flip;
        const chatL = get("LINK_CHAT") !== 'N/A' ? get("LINK_CHAT") : null;
        
        const paxListRaw = get("PAX_LIST");
        const paxItems = paxListRaw !== 'N/A' && paxListRaw !== '' ? paxListRaw.split('||') : [];

        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000 }}>
            <div style={{ background: 'var(--card-bg)', width: '950px', height: '85vh', borderRadius: '25px', display: 'flex', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              <div style={{ flex: 1.2, padding: '35px', overflowY: 'auto', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0 }}>{tarefaAberta.titulo}</h2>
                  <X onClick={() => setTarefaAberta(null)} cursor="pointer" />
                </div>
                
                {/* TABELA GENÉRICA: SÓ APARECE SE NÃO FOR EMISSÃO */}
                {tarefaAberta.setor_destino !== 'Emissão' && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '25px', border: '1px solid var(--border-color)' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}><td style={{ padding: '12px', background: 'rgba(128,128,128,0.1)', fontWeight: 'bold', width: '35%' }}>Localizador</td><td style={{ padding: '12px' }}>{get("LOC")}</td></tr>
                        <tr style={{ borderBottom: '1px solid var(--border-color)' }}><td style={{ padding: '12px', background: 'rgba(128,128,128,0.1)', fontWeight: 'bold' }}>Cia Aérea</td><td style={{ padding: '12px' }}>{get("CIA")}</td></tr>
                        
                        {/* OCULTA DATA E HORÁRIO SE O CARD FOR DO BACK-OFFICE OU FINANCEIRO */}
                        {tarefaAberta.setor_destino !== 'Back-office' && tarefaAberta.setor_destino !== 'Financeiro' && (
                          <>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '12px', background: 'rgba(128,128,128,0.1)', fontWeight: 'bold' }}>Data do Voo</td>
                              <td style={{ padding: '12px', textAlign: 'left' }}>{(() => {
                                  const dataVoo = get("DATA");
                                  if (!dataVoo || dataVoo === 'N/A' || dataVoo.trim() === '') return 'N/A';
                                  const formataD = (dStr) => { const cleanD = dStr.trim(); if (cleanD.includes('-')) { const [ano, mes, dia] = cleanD.split('-'); return `${dia.trim()}/${mes.trim()}/${ano.trim()}`; } return cleanD; };
                                  return formataD(dataVoo);
                                })()}</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '12px', background: 'rgba(128,128,128,0.1)', fontWeight: 'bold' }}>Horário do Voo</td>
                                <td style={{ padding: '12px' }}>{get("HORARIO") !== 'N/A' && get("HORARIO") !== '' ? get("HORARIO").replace('IDA:', '').trim() : <span style={{ opacity: 0.5 }}>Não informado</span>}</td>
                            </tr>
                          </>
                        )}
                        
                        <tr><td style={{ padding: '12px', background: 'rgba(128,128,128,0.1)', fontWeight: 'bold' }}>Fornecedor</td><td style={{ padding: '12px' }}>{get("FORN")}</td></tr>
                      </tbody>
                    </table>
                )}

                {tarefaAberta.setor_destino === 'Financeiro' && (
                  <div style={{ marginBottom: '15px', padding: '12px', border: '1px solid #00b894', borderRadius: '12px', background: 'rgba(0,184,148,0.05)', color: '#00b894', fontWeight: 'bold' }}>TIPO FINANCEIRO: {tarefaAberta.titulo.includes('[') ? tarefaAberta.titulo.split('[')[1].split(']')[0] : 'Reembolso'}</div>
                )}
                {tarefaAberta.setor_destino === 'Back-office' && (
                  <div style={{ marginBottom: '15px', padding: '12px', border: '1px solid #6c5ce7', borderRadius: '12px', background: 'rgba(108,92,231,0.05)', color: '#6c5ce7', fontWeight: 'bold' }}>PROCESSO BACK-OFFICE: {tarefaAberta.titulo.includes('[') ? tarefaAberta.titulo.split('[')[1].split(']')[0] : 'Geral'}</div>
                )}

                {tarefaAberta.setor_destino === 'Emissão' && usuarioLogado.setor.toLowerCase() === 'emissão' && (
                  <div style={{ marginBottom: '15px', padding: '15px', border: '1px dashed #00b894', borderRadius: '12px', background: 'rgba(0,184,148,0.05)' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '12px', fontSize: '13px', color: '#00b894' }}>✍️ PREENCHER DADOS DO VOO EMITIDO</div>
                    <form onSubmit={atualizarDadosEmissao} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                        <input placeholder="Novo Localizador..." value={dadosEmissao.loc} onChange={e => setDadosEmissao({...dadosEmissao, loc: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid #00b894', color: 'var(--text-color)', outline: 'none' }} />
                        <input placeholder="Cia Aérea..." value={dadosEmissao.cia} onChange={e => setDadosEmissao({...dadosEmissao, cia: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid #00b894', color: 'var(--text-color)', outline: 'none' }} />
                        <input placeholder="Fornecedor..." value={dadosEmissao.forn} onChange={e => setDadosEmissao({...dadosEmissao, forn: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'var(--bg-color)', border: '1px solid #00b894', color: 'var(--text-color)', outline: 'none' }} />
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-color)', border: '1px solid #00b894', borderRadius: '8px', padding: '0 10px' }}>
                            <span style={{ fontSize: '12px', opacity: 0.8, color: '#00b894', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Data Ida:</span>
                            <input type="date" value={dadosEmissao.data_ida} onChange={e => setDadosEmissao({...dadosEmissao, data_ida: e.target.value})} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none' }} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-color)', border: '1px solid #00b894', borderRadius: '8px', padding: '0 10px' }}>
                            <span style={{ fontSize: '12px', opacity: 0.8, color: '#00b894', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Horário Ida:</span>
                            <input type="time" value={dadosEmissao.horario_ida} onChange={e => setDadosEmissao({...dadosEmissao, horario_ida: e.target.value})} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none' }} />
                        </div>
                      </div>

                      {get("ORIGEM_DESTINO").includes('| VOLTA:') && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-color)', border: '1px solid #00b894', borderRadius: '8px', padding: '0 10px' }}>
                              <span style={{ fontSize: '12px', opacity: 0.8, color: '#00b894', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Data Volta:</span>
                              <input type="date" value={dadosEmissao.data_volta} onChange={e => setDadosEmissao({...dadosEmissao, data_volta: e.target.value})} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none' }} />
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--bg-color)', border: '1px solid #00b894', borderRadius: '8px', padding: '0 10px' }}>
                              <span style={{ fontSize: '12px', opacity: 0.8, color: '#00b894', whiteSpace: 'nowrap', fontWeight: 'bold' }}>Horário Volta:</span>
                              <input type="time" value={dadosEmissao.horario_volta} onChange={e => setDadosEmissao({...dadosEmissao, horario_volta: e.target.value})} style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-color)', outline: 'none' }} />
                          </div>
                        </div>
                      )}

                      <button type="submit" style={{ padding: '10px', background: '#00b894', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px' }}>✓ SALVAR E ATUALIZAR CARD</button>
                    </form>
                  </div>
                )}

                {tarefaAberta.setor_destino === 'Emissão' && (
                  <div style={{ marginBottom: '15px', padding: '15px', border: '1px solid #0984e3', borderRadius: '12px', background: 'rgba(9,132,227,0.05)', color: '#0984e3' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '15px', fontSize: '14px' }}>✈️ DADOS DA NOVA EMISSÃO</div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '13px', marginBottom: '15px' }}>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <strong style={{ fontSize: '11px', opacity: 0.8 }}>TRECHO:</strong>
                            <span style={{ color: 'var(--text-color)' }}>
                                {get("ORIGEM_DESTINO").includes('| VOLTA:') ? (
                                    <>
                                        {get("ORIGEM_DESTINO").split('|')[0].trim()} <br/>
                                        {get("ORIGEM_DESTINO").split('|')[1].trim()}
                                    </>
                                ) : (
                                    get("ORIGEM_DESTINO")
                                )}
                            </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <strong style={{ fontSize: '11px', opacity: 0.8 }}>DATA DO VOO:</strong>
                            <span style={{ color: 'var(--text-color)' }}>
                                {(() => {
                                  const dataVoo = get("DATA");
                                  if (!dataVoo || dataVoo === 'N/A' || dataVoo.trim() === '') return <span style={{opacity: 0.5}}>Não informada</span>;
                                  
                                  const formataD = (dStr) => { 
                                      if (!dStr || dStr === 'N/A') return 'N/A';
                                      const match = dStr.match(/(\d{4})-(\d{2})-(\d{2})/);
                                      if (match) return `${match[3]}/${match[2]}/${match[1]}`;
                                      return dStr.replace('IDA:', '').replace('VOLTA:', '').trim(); 
                                  };

                                  if (dataVoo.includes('| VOLTA:')) {
                                      const partes = dataVoo.split('|');
                                      return (
                                          <>
                                              IDA: {formataD(partes[0].replace('IDA:', ''))} <br/>
                                              VOLTA: {formataD(partes[1].replace('VOLTA:', ''))}
                                          </>
                                      );
                                  }
                                  return formataD(dataVoo);
                                })()}
                            </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <strong style={{ fontSize: '11px', opacity: 0.8 }}>PASSAGEIROS:</strong>
                            <span style={{ color: 'var(--text-color)' }}>
                                {get("PAX").replace(/ADT/g, 'Adulto').replace(/CHD/g, 'Criança').replace(/INF/g, 'Bebê')}
                            </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <strong style={{ fontSize: '11px', opacity: 0.8 }}>HORÁRIO:</strong>
                            <span style={{ color: 'var(--text-color)' }}>
                                {(() => {
                                    const hVoo = get("HORARIO");
                                    const isRound = get("ORIGEM_DESTINO").includes('| VOLTA:');
                                    
                                    if (isRound) {
                                        let hIda = 'N/A', hVolta = 'N/A';
                                        if (hVoo && hVoo !== 'N/A' && hVoo.includes('| VOLTA:')) {
                                            const partes = hVoo.split('|');
                                            hIda = partes[0].replace('IDA:', '').trim();
                                            hVolta = partes[1].replace('VOLTA:', '').trim();
                                        } else if (hVoo && hVoo !== 'N/A' && !hVoo.includes('| VOLTA:')) {
                                            hIda = hVoo.replace('IDA:', '').trim(); 
                                        }
                                        return (
                                            <>
                                                IDA: {hIda === 'N/A' || hIda === '' ? <span style={{opacity: 0.5}}>--:--</span> : hIda} <br/>
                                                VOLTA: {hVolta === 'N/A' || hVolta === '' ? <span style={{opacity: 0.5}}>--:--</span> : hVolta}
                                            </>
                                        );
                                    } else {
                                        if (!hVoo || hVoo === 'N/A' || hVoo.trim() === '') return <span style={{opacity: 0.5}}>Não informado</span>;
                                        return hVoo.replace('IDA:', '').trim();
                                    }
                                })()}
                            </span>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px dashed rgba(9,132,227,0.3)', paddingTop: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <strong style={{ fontSize: '11px', opacity: 0.8 }}>LOCALIZADOR:</strong> 
                            <span style={{ color: 'var(--text-color)', fontWeight: 'bold' }}>{get("LOC")}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <strong style={{ fontSize: '11px', opacity: 0.8 }}>CIA AÉREA:</strong> 
                            <span style={{ color: 'var(--text-color)' }}>{get("CIA")}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <strong style={{ fontSize: '11px', opacity: 0.8 }}>FORNECEDOR:</strong> 
                            <span style={{ color: 'var(--text-color)' }}>{get("FORN")}</span>
                        </div>
                    </div>
                    
                    {paxItems.length > 0 && (
                      <div style={{ marginTop: '20px', borderTop: '1px solid rgba(9,132,227,0.2)', paddingTop: '15px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                         <strong style={{ fontSize: '11px', opacity: 0.8 }}>LISTA DE PASSAGEIROS E DADOS:</strong>
                         {paxItems.map((px, idx) => {
                             const [pNome, pCpf, pBag] = px.split('::');
                             return (
                                 <div key={idx} style={{ display: 'flex', gap: '10px', fontSize: '12px', color: 'var(--text-color)', background: 'rgba(128,128,128,0.1)', padding: '8px 10px', borderRadius: '6px' }}>
                                     <div style={{ flex: 2 }}><strong>NOME:</strong> {pNome}</div>
                                     <div style={{ flex: 1.5 }}><strong>CPF:</strong> {pCpf}</div>
                                     <div style={{ flex: 1 }}><strong>BAG:</strong> {pBag}</div>
                                 </div>
                             )
                         })}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ flex: 1, padding: '12px', border: '1px solid var(--accent-color)', borderRadius: '12px', background: 'rgba(0,0,0,0.1)', fontSize: '12px' }}><strong>DE:</strong> {tarefaAberta.setor_origem?.toUpperCase()} ({tarefaAberta.responsavel})</div>
                    <div style={{ flex: 1, padding: '12px', border: '1px solid var(--accent-color)', borderRadius: '12px', background: 'rgba(0,0,0,0.1)', fontSize: '12px' }}><strong>PARA:</strong> {tarefaAberta.setor_destino?.toUpperCase()}</div>
                </div>
                <div style={{ padding: '15px', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'rgba(128,128,128,0.05)', minHeight: '100px', fontSize: '15px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', flexShrink: 0 }}>
                  <small style={{ opacity: 0.5, display: 'block', marginBottom: '10px' }}>DETALHES DA DEMANDA / INFORMAÇÕES EXTRAS</small>
                  {d.includes("INFO:") ? d.split("INFO:")[1]?.trim() : d}
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', gap: '10px', paddingTop: '20px', flexShrink: 0 }}>
                  {flip && flip !== 'N/A' && <a href={flip.startsWith('http') ? flip : `https://${flip}`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', background: '#0984e3', color: '#fff', padding: '12px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><ExternalLink size={16}/> FLIP MILHAS</a>}
                  {chatL && chatL !== 'N/A' && <a href={chatL.startsWith('http') ? chatL : `https://${chatL}`} target="_blank" rel="noreferrer" style={{ flex: 1, textAlign: 'center', background: '#6c5ce7', color: '#fff', padding: '12px', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><ExternalLink size={16}/> CHAT CLIENTE</a>}
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
                  <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}><Paperclip size={20} color={arquivoComentario ? "#00b894" : "gray"}/><input type="file" onChange={e => setArquivoComentario(e.target.files[0])} style={{ display: 'none' }} /></label>
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