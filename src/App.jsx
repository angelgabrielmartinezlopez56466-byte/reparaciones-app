import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";

const ESTADOS = [
  "Recibido","En diagnóstico","Esperando autorización",
  "En reparación","Listo para entregar","Entregado","Cancelado",
];
const estadoClass = {
  Recibido: "badge badge-slate",
  "En diagnóstico": "badge badge-indigo",
  "Esperando autorización": "badge badge-amber",
  "En reparación": "badge badge-blue",
  "Listo para entregar": "badge badge-green",
  Entregado: "badge badge-gray",
  Cancelado: "badge badge-red",
};

const emptyCliente     = { id: null, nombre: "", telefono: "", correo: "" };
const emptyDispositivo = { id: null, cliente_id: "", marca: "", modelo: "", numero_serie: "", falla: "" };
const emptyReparacion  = {
  id: null, dispositivo_id: "", descripcion: "", diagnostico: "",
  estado: "Recibido", costo_estimado: "0", costo_final: "0",
  anticipo: "0", fecha_estimada_entrega: "",
};
const emptyUsuario = { id: null, nombre: "", usuario: "", password: "", rol: "empleado", activo: true };

function money(v) { return `$${Number(v||0).toLocaleString("es-MX",{minimumFractionDigits:2,maximumFractionDigits:2})}`; }
function dateFmt(v) { return v ? new Date(v).toLocaleDateString("es-MX") : "—"; }
function dateTimeFmt(v) { return v ? new Date(v).toLocaleString("es-MX") : "—"; }
function saldoPendiente(r) { return Math.max(Number(r.costo_final||0)-Number(r.anticipo||0),0); }

function Badge({ estado }) {
  return <span className={estadoClass[estado]||estadoClass.Recibido}>{estado||"Sin estado"}</span>;
}

function Button({ children, onClick, type="button", variant="primary", full=false, disabled=false }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`btn btn-${variant}${full?" btn-full":""}`}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, placeholder, type="text", min, step, required=false }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <input type={type} min={min} step={step} value={value}
        placeholder={placeholder} onChange={onChange} required={required} />
    </label>
  );
}
function TextArea({ label, value, onChange, placeholder }) {
  return (
    <label className="field field-wide">
      {label && <span>{label}</span>}
      <textarea value={value} placeholder={placeholder} onChange={onChange} rows={3} />
    </label>
  );
}
function Select({ label, value, onChange, children, required=false }) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      <select value={value} onChange={onChange} required={required}>{children}</select>
    </label>
  );
}
function Card({ title, subtitle, children, right }) {
  return (
    <section className="card">
      {(title||right) && (
        <div className="card-header">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {right && <div className="card-actions">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
function Stat({ label, value, hint }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}
function Table({ headers, children, empty }) {
  const rows = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];
  if (!rows.length) return <div className="empty-state">{empty||"Sin registros."}</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}
function Td({ children, strong=false, muted=false, className="" }) {
  return <td className={`${strong?"td-strong":""} ${muted?"td-muted":""} ${className}`}>{children}</td>;
}
function Toast({ message }) {
  if (!message) return null;
  return <div className="toast">{message}</div>;
}

/* ─── Portal Cliente ──────────────────────────── */
function PortalCliente() {
  const [folio, setFolio] = useState("");
  const [telefono, setTelefono] = useState("");
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function consultar(e) {
    e?.preventDefault();
    setError(""); setResultado(null);
    if (!folio.trim()||!telefono.trim()) { setError("Ingresa el folio y teléfono registrados."); return; }
    setCargando(true);
    try {
      const res = await fetch(`${API}/portal/consulta`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({folio:folio.trim(),telefono:telefono.trim()}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||"No se pudo consultar la reparación.");
      setResultado(data);
    } catch(err) { setError(err.message||"No se pudo conectar con el servidor."); }
    finally { setCargando(false); }
  }

  return (
    <div className="portal-form-wrap">
      <form className="form-grid portal-form" onSubmit={consultar}>
        <Input label="Folio" value={folio} onChange={e=>setFolio(e.target.value.toUpperCase())} />
        <Input label="Teléfono registrado" value={telefono} onChange={e=>setTelefono(e.target.value)} />
        <div className="field-submit">
          <Button type="submit" disabled={cargando}>{cargando?"Buscando…":"Consultar"}</Button>
        </div>
      </form>
      {error && <div className="alert alert-error" style={{marginTop:14}}>{error}</div>}
      {resultado && (
        <div className="portal-result">
          <div className="portal-head">
            <div>
              <span className="eyebrow" style={{fontSize:10}}>Folio de servicio</span>
              <h3>{resultado.reparacion.folio}</h3>
              <p>{resultado.reparacion.marca} {resultado.reparacion.modelo}</p>
              <small>{resultado.reparacion.falla}</small>
            </div>
            <Badge estado={resultado.reparacion.estado} />
          </div>
          <div className="stats-grid compact">
            <Stat label="Costo" value={money(resultado.reparacion.costo_final)} />
            <Stat label="Anticipo" value={money(resultado.reparacion.anticipo)} />
            <Stat label="Entrega estimada" value={dateFmt(resultado.reparacion.fecha_estimada_entrega)} />
          </div>
          <div className="detail-box">
            <span>Diagnóstico</span>
            <p>{resultado.reparacion.diagnostico||"Pendiente de registro."}</p>
          </div>
          <h4 className="section-title">Historial de la orden</h4>
          <Table headers={["Fecha","Estado","Comentario"]} empty="Sin movimientos registrados.">
            {resultado.historial.map((h,i)=>(
              <tr key={i}>
                <Td muted>{dateTimeFmt(h.fecha)}</Td>
                <Td><Badge estado={h.estado_nuevo}/></Td>
                <Td>{h.comentario||"—"}</Td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </div>
  );
}

/* ─── Página pública (Landing) ─────────────────── */
const SERVICIOS = [
  {
    tag:"Software",
    titulo:"Instalación de Windows",
    desc:"Windows 10 y 11 en versiones Home, Pro y LTSC Empresarial. Instalación limpia, activación de licencia y configuración inicial lista para usar.",
    chips:["Win 10 Home","Win 11 Pro","LTSC Empresarial","Activación"],
    foto:"https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
  },
  {
    tag:"Software",
    titulo:"Office y software general",
    desc:"Instalación y activación de Microsoft Office (2019/2021/365) y cualquier software que necesites: antivirus, drivers, herramientas de trabajo.",
    chips:["Office 2021","Office 365","Drivers","Antivirus"],
    foto:"https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=600&q=80",
  },
  {
    tag:"Linux",
    titulo:"Instalación de Linux",
    desc:"Ubuntu, Linux Mint, Debian, Fedora y cualquier distribución. Entorno completamente configurado y listo: navegador, office libre, actualizaciones y más.",
    chips:["Ubuntu","Linux Mint","Debian","Fedora","Arch"],
    foto:"https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=600&q=80",
  },
  {
    tag:"Hardware",
    titulo:"Revive tu laptop",
    desc:"Laptops lentas o que 'ya no sirven' tienen solución. Diagnóstico completo, limpieza profunda, pasta térmica y optimización para devolverle la vida al equipo.",
    chips:["Diagnóstico","Limpieza","Optimización","Pasta térmica"],
    foto:"https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&q=80",
  },
  {
    tag:"Hardware",
    titulo:"Cambio a SSD / M.2",
    desc:"Cambia tu disco duro tradicional (HDD) por un SSD o M.2 y siente la diferencia desde el primer arranque. Clonamos tus datos sin perder nada.",
    chips:["HDD → SSD","HDD → M.2","Clonado de datos","RAM upgrade"],
    foto:"https://images.unsplash.com/photo-1601737487795-dab272f52420?w=600&q=80",
  },
  {
    tag:"Hardware",
    titulo:"Cambio de repuestos",
    desc:"Pantallas rotas, teclados, disipadores, mausepads y más. Diagnosticamos primero y cotizamos antes de cualquier trabajo. Solo repuestos compatibles.",
    chips:["Pantallas","Teclados","Disipadores","Cargadores","Baterías"],
    foto:"https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=600&q=80",
  },
  {
    tag:"Mantenimiento",
    titulo:"Limpieza profunda",
    desc:"Limpieza interna con aire a presión, cambio de pasta térmica y revisión de componentes. Reduce temperaturas y alarga la vida útil del equipo.",
    chips:["Pasta térmica","Ventiladores","Temperatura","Preventivo"],
    foto:"https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80",
  },
  {
    tag:"Software",
    titulo:"Optimización de Windows",
    desc:"Windows lento o lleno de programas que no usas. Limpiamos el inicio, desinstalamos bloatware, actualizamos drivers y configuramos para máximo rendimiento.",
    chips:["Desfragmentación","Inicio rápido","Drivers","Privacidad"],
    foto:"https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&q=80",
  },
];

const PASOS = [
  { titulo:"Recepción del equipo",   desc:"Registramos tus datos, el equipo y la falla que reportas. Te damos un folio para rastrear tu servicio." },
  { titulo:"Diagnóstico",            desc:"Revisamos a fondo el problema y te informamos qué encontramos antes de hacer cualquier trabajo." },
  { titulo:"Autorización",           desc:"Te cotizamos y esperamos tu visto bueno. Nada se hace sin tu aprobación previa." },
  { titulo:"Reparación / servicio",  desc:"Ejecutamos el trabajo acordado con repuestos compatibles y software original o libre." },
  { titulo:"Entrega y cierre",       desc:"Te avisamos cuando está listo. Entregamos el equipo probado y te explicamos lo que se hizo." },
];

const MARCAS = ["HP","Dell","Lenovo","Acer","ASUS"];

function LandingNav({ onGo }) {
  return (
    <header className="public-nav">
      <button type="button" className="nav-marca" onClick={()=>onGo("inicio")}>
        <span className="nav-marca-dot">B</span>
        <span className="nav-marca-nombre">Ban Reparaciones</span>
      </button>
      <nav>
        <button type="button" onClick={()=>onGo("servicios")}>Servicios</button>
        <button type="button" onClick={()=>onGo("proceso")}>Proceso</button>
        <button type="button" onClick={()=>onGo("consulta")}>Consultar equipo</button>
        <button type="button" onClick={()=>onGo("acceso")}>Acceso interno</button>
      </nav>
    </header>
  );
}

function Login({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  function irA(id) { document.getElementById(id)?.scrollIntoView({ behavior:"smooth", block:"start" }); }

  async function entrar(e) {
    e.preventDefault(); setError("");
    if (!usuario.trim()||!password) { setError("Ingresa usuario y contraseña."); return; }
    setCargando(true);
    try {
      const res = await fetch(`${API}/auth/login`,{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({usuario:usuario.trim(),password}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||"No se pudo iniciar sesión.");
      onLogin(data);
    } catch(err) { setError(err.message||"No se pudo conectar con el servidor."); }
    finally { setCargando(false); }
  }

  return (
    <main className="public-page">
      <LandingNav onGo={irA} />

      {/* HERO */}
      <section id="inicio" className="public-section hero-section">
        <div className="hero-copy">
          <span className="eyebrow">Servicio técnico · Veracruz</span>
          <h1>Servicio técnico<br/>para tu<br/><span>laptop o PC.</span></h1>
          <p className="hero-lead">
            Diagnóstico, mantenimiento, instalación de sistemas y cambio de componentes.
            Trabajo con garantía y folio de seguimiento para cada cliente.
          </p>
          <div className="hero-actions">
            <Button onClick={()=>irA("servicios")}>Ver servicios</Button>
            <Button variant="ghost" onClick={()=>irA("consulta")}>Consultar mi equipo</Button>
          </div>
        </div>
        <div className="hero-foto-wrap">
          <img
            src="https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=960&q=85"
            alt="Técnico reparando laptop"
          />
          <div className="hero-foto-label">
            <div className="hero-foto-dot"></div>
            <div>
              <p>Taller en operación</p>
              <small>Folio de seguimiento en cada servicio</small>
            </div>
          </div>
        </div>
      </section>

      {/* MARCAS */}
      <div className="marcas-strip">
        <div className="marcas-inner">
          <span className="marcas-label">Trabajamos con laptops y PCs de</span>
          <div className="marcas-list">
            {MARCAS.map(m=><span key={m} className="marca-chip">{m}</span>)}
          </div>
        </div>
      </div>

      {/* SERVICIOS */}
      <section id="servicios" className="public-section">
        <div className="servicios-grid">
          {SERVICIOS.map(s=>(
            <article className="servicio-card" key={s.titulo}>
              <div className="servicio-foto">
                <img src={s.foto} alt={s.titulo} loading="lazy"/>
                <span className="servicio-tag">{s.tag}</span>
              </div>
              <div className="servicio-body">
                <h3>{s.titulo}</h3>
                <p>{s.desc}</p>
                <div className="servicio-detalle">
                  {s.chips.map(c=><span key={c} className="servicio-chip">{c}</span>)}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* PROCESO */}
      <section id="proceso" className="public-section">
        <div className="proceso-section">
          <div className="proceso-foto">
            <img
              src="https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=800&q=80"
              alt="Técnico trabajando en laptop"
            />
            <div className="proceso-foto-overlay"></div>
            <div className="proceso-foto-caption">
              <h4>Transparencia en cada paso</h4>
              <p>Sin sorpresas en el precio. Cotización antes de cualquier trabajo.</p>
            </div>
          </div>
          <div>
            <div className="section-head" style={{textAlign:"left",marginBottom:24}}>
              <span className="eyebrow">Proceso de atención</span>
              <h2>De recepción a entrega, todo queda registrado</h2>
            </div>
            <div className="proceso-pasos">
              {PASOS.map((p,i)=>(
                <div className="proceso-paso" key={p.titulo}>
                  <div className="paso-num">{String(i+1).padStart(2,"0")}</div>
                  <div className="paso-texto">
                    <h4>{p.titulo}</h4>
                    <p>{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CONSULTA */}
      <section id="consulta" className="public-section">
        <div className="portal-section">
          <div className="section-head">
            <span className="eyebrow">Clientes</span>
            <h2>Consulta tu reparación</h2>
            <p>Si ya tienes un folio y el teléfono que registraste al dejar tu equipo, puedes consultar el estado aquí.</p>
          </div>
          <PortalCliente />
        </div>
      </section>

      {/* ACCESO INTERNO */}
      <section id="acceso" className="public-section">
        <div className="acceso-grid">
          <div className="acceso-copy">
            <span className="eyebrow">Personal autorizado</span>
            <h2>Acceso al panel interno</h2>
            <p>
              Área reservada para técnicos y administradores. Desde aquí se
              registran clientes, equipos, órdenes de reparación, estados y reportes.
            </p>
          </div>
          <Card title="Ingresar al panel">
            <form onSubmit={entrar} className="login-form">
              <Input label="Usuario" value={usuario} onChange={e=>setUsuario(e.target.value)} />
              <Input label="Contraseña" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
              {error && <div className="alert alert-error">{error}</div>}
              <Button type="submit" full disabled={cargando}>{cargando?"Entrando…":"Entrar al sistema"}</Button>
            </form>
          </Card>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="site-footer">
        <span className="footer-marca">Ban Reparaciones</span>
        <span className="footer-copy">Servicio técnico en computadoras y laptops</span>
      </footer>
    </main>
  );
}

/* ─── Panel interno ──────────────────────────────── */
export default function App() {
  const savedSession = useMemo(()=>{
    try { return JSON.parse(localStorage.getItem("sesion_reparaciones")); } catch { return null; }
  },[]);

  const [token, setToken]       = useState(savedSession?.token||"");
  const [usuario, setUsuario]   = useState(savedSession?.usuario||null);
  const [tab, setTab]           = useState("dashboard");
  const [clientes, setClientes] = useState([]);
  const [dispositivos, setDispositivos] = useState([]);
  const [reparaciones, setReparaciones] = useState([]);
  const [reportes, setReportes] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  const [msg, setMsg]           = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [loading, setLoading]   = useState(false);

  const [clienteForm, setClienteForm]         = useState(emptyCliente);
  const [dispositivoForm, setDispositivoForm] = useState(emptyDispositivo);
  const [reparacionForm, setReparacionForm]   = useState(emptyReparacion);
  const [usuarioForm, setUsuarioForm]         = useState(emptyUsuario);

  const esAdmin = usuario?.rol==="admin";

  function toast(t) {
    setMsg(t);
    window.clearTimeout(window.__toast);
    window.__toast = window.setTimeout(()=>setMsg(""),2800);
  }
  function salir() {
    setToken(""); setUsuario(null); setTab("dashboard");
    localStorage.removeItem("sesion_reparaciones");
  }

  async function api(path, options={}) {
    const headers = {...(options.headers||{}), Authorization:`Bearer ${token}`};
    if (options.body && !headers["Content-Type"]) headers["Content-Type"]="application/json";
    const res  = await fetch(`${API}${path}`,{...options,headers});
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch {}
    if (!res.ok) { if (res.status===401) salir(); throw new Error(data?.error||"No se pudo completar la solicitud."); }
    return data;
  }

  async function cargarDatos() {
    if (!token) return;
    setLoading(true);
    try {
      const [c,d,r] = await Promise.all([api("/clientes"),api("/dispositivos"),api("/reparaciones")]);
      setClientes(c||[]); setDispositivos(d||[]); setReparaciones(r||[]);
      if (esAdmin) {
        const [rep,us] = await Promise.all([api("/admin/reportes"),api("/admin/usuarios")]);
        setReportes(rep); setUsuarios(us||[]);
      } else { setReportes(null); setUsuarios([]); }
    } catch(err) { toast(err.message); }
    finally { setLoading(false); }
  }

  useEffect(()=>{ cargarDatos(); },[token,usuario?.rol]);

  function iniciarSesion(data) {
    setToken(data.token); setUsuario(data.usuario);
    localStorage.setItem("sesion_reparaciones",JSON.stringify(data));
  }

  async function guardarCliente(e) {
    e?.preventDefault();
    try {
      const p={nombre:clienteForm.nombre.trim(),telefono:clienteForm.telefono.trim(),correo:clienteForm.correo.trim().toLowerCase()};
      if (clienteForm.id) await api(`/clientes/${clienteForm.id}`,{method:"PUT",body:JSON.stringify(p)});
      else await api("/clientes",{method:"POST",body:JSON.stringify(p)});
      setClienteForm(emptyCliente); toast("Cliente guardado."); cargarDatos();
    } catch(err){toast(err.message);}
  }
  async function guardarDispositivo(e) {
    e?.preventDefault();
    try {
      const p={...dispositivoForm,cliente_id:Number(dispositivoForm.cliente_id)};
      if (dispositivoForm.id) await api(`/dispositivos/${dispositivoForm.id}`,{method:"PUT",body:JSON.stringify(p)});
      else await api("/dispositivos",{method:"POST",body:JSON.stringify(p)});
      setDispositivoForm(emptyDispositivo); toast("Dispositivo guardado."); cargarDatos();
    } catch(err){toast(err.message);}
  }
  async function guardarReparacion(e) {
    e?.preventDefault();
    try {
      const p={...reparacionForm,dispositivo_id:Number(reparacionForm.dispositivo_id),
        costo_estimado:Number(reparacionForm.costo_estimado||0),
        costo_final:Number(reparacionForm.costo_final||0),
        anticipo:Number(reparacionForm.anticipo||0)};
      if (reparacionForm.id) await api(`/reparaciones/${reparacionForm.id}`,{method:"PUT",body:JSON.stringify(p)});
      else await api("/reparaciones",{method:"POST",body:JSON.stringify(p)});
      setReparacionForm(emptyReparacion); toast("Orden guardada."); cargarDatos();
    } catch(err){toast(err.message);}
  }
  async function cambiarEstado(id,estado) {
    try { await api(`/reparaciones/${id}/estado`,{method:"PATCH",body:JSON.stringify({estado})}); toast("Estado actualizado."); cargarDatos(); }
    catch(err){toast(err.message);}
  }
  async function enviarCorreo(id) {
    try { const d=await api(`/reparaciones/${id}/aviso-correo`); window.location.href=d.mailto; toast("Aviso preparado."); cargarDatos(); }
    catch(err){toast(err.message);}
  }
  async function eliminar(tipo,id) {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try { await api(`/${tipo}/${id}`,{method:"DELETE"}); toast("Registro eliminado."); cargarDatos(); }
    catch(err){toast(err.message);}
  }
  async function guardarUsuario(e) {
    e?.preventDefault();
    try {
      if (usuarioForm.id) await api(`/admin/usuarios/${usuarioForm.id}`,{method:"PUT",body:JSON.stringify(usuarioForm)});
      else await api("/admin/usuarios",{method:"POST",body:JSON.stringify(usuarioForm)});
      setUsuarioForm(emptyUsuario); toast("Usuario guardado."); cargarDatos();
    } catch(err){toast(err.message);}
  }
  async function cambiarPassword(id) {
    const pw=window.prompt("Nueva contraseña:");
    if (!pw) return;
    try { await api(`/admin/usuarios/${id}/password`,{method:"PATCH",body:JSON.stringify({password:pw})}); toast("Contraseña actualizada."); }
    catch(err){toast(err.message);}
  }
  async function cambiarEstadoUsuario(u) {
    try { await api(`/admin/usuarios/${u.id}/estado`,{method:"PATCH",body:JSON.stringify({activo:!u.activo})}); toast("Estado actualizado."); cargarDatos(); }
    catch(err){toast(err.message);}
  }

  function editCliente(c) { setClienteForm({id:c.id,nombre:c.nombre||"",telefono:c.telefono||"",correo:c.correo||""}); window.scrollTo({top:0,behavior:"smooth"}); }
  function editDispositivo(d) { setDispositivoForm({id:d.id,cliente_id:String(d.cliente_id||""),marca:d.marca||"",modelo:d.modelo||"",numero_serie:d.numero_serie||"",falla:d.falla||""}); window.scrollTo({top:0,behavior:"smooth"}); }
  function editReparacion(r) {
    setReparacionForm({id:r.id,dispositivo_id:String(r.dispositivo_id||""),descripcion:r.descripcion||"",diagnostico:r.diagnostico||"",estado:r.estado||"Recibido",costo_estimado:String(r.costo_estimado??0),costo_final:String(r.costo_final??0),anticipo:String(r.anticipo??0),fecha_estimada_entrega:r.fecha_estimada_entrega?String(r.fecha_estimada_entrega).slice(0,10):""});
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function editUsuario(u) { setUsuarioForm({id:u.id,nombre:u.nombre||"",usuario:u.usuario||"",password:"",rol:u.rol||"empleado",activo:Boolean(u.activo)}); window.scrollTo({top:0,behavior:"smooth"}); }

  const repFiltradas = reparaciones.filter(r=>{
    const txt=`${r.folio||""} ${r.cliente_nombre||""} ${r.marca||""} ${r.modelo||""} ${r.falla||""}`.toLowerCase();
    return (filtroEstado==="Todos"||r.estado===filtroEstado) && txt.includes(busqueda.toLowerCase());
  });
  const activas   = reparaciones.filter(r=>!["Entregado","Cancelado"].includes(r.estado)).length;
  const listas    = reparaciones.filter(r=>r.estado==="Listo para entregar").length;
  const entregadas= reparaciones.filter(r=>r.estado==="Entregado").length;

  const tabs = esAdmin
    ? ["dashboard","clientes","dispositivos","reparaciones","reportes","usuarios","portal"]
    : ["dashboard","clientes","dispositivos","reparaciones","portal"];
  const labels = { dashboard:"Inicio",clientes:"Clientes",dispositivos:"Dispositivos",reparaciones:"Reparaciones",reportes:"Reportes",usuarios:"Usuarios",portal:"Portal cliente" };

  if (!token||!usuario) return <Login onLogin={iniciarSesion}/>;

  return (
    <div className="app-shell">
      <Toast message={msg}/>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-row">
            <span className="sidebar-brand-dot">B</span>
            <div>
              <strong>Ban Reparaciones</strong>
              <span>{usuario.rol==="admin"?"Administrador":"Técnico"}</span>
            </div>
          </div>
        </div>
        <nav className="nav-list">
          {tabs.map(t=>(
            <button key={t} className={tab===t?"active":""} onClick={()=>setTab(t)}>{labels[t]}</button>
          ))}
        </nav>
        <div className="sidebar-user">
          <span>{usuario.nombre}</span>
          <Button variant="ghost" onClick={salir} full>Salir</Button>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <h1>{labels[tab]}</h1>
          <Button variant="ghost" onClick={cargarDatos} disabled={loading}>{loading?"Actualizando…":"Actualizar"}</Button>
        </header>

        {tab==="dashboard" && (
          <>
            <div className="stats-grid">
              <Stat label="Clientes" value={clientes.length}/>
              <Stat label="Dispositivos" value={dispositivos.length}/>
              <Stat label="Órdenes activas" value={activas}/>
              <Stat label="Listas para entrega" value={listas}/>
              <Stat label="Entregadas" value={entregadas}/>
            </div>
            <Card title="Órdenes recientes">
              <Table headers={["Folio","Cliente","Equipo","Estado","Saldo"]} empty="Todavía no hay reparaciones registradas.">
                {reparaciones.slice(0,8).map(r=>(
                  <tr key={r.id}>
                    <Td strong>{r.folio}<small>{dateFmt(r.fecha_ingreso)}</small></Td>
                    <Td>{r.cliente_nombre}</Td>
                    <Td>{r.marca} {r.modelo}</Td>
                    <Td><Badge estado={r.estado}/></Td>
                    <Td strong>{money(saldoPendiente(r))}</Td>
                  </tr>
                ))}
              </Table>
            </Card>
          </>
        )}

        {tab==="clientes" && (
          <>
            <Card title={clienteForm.id?"Editar cliente":"Nuevo cliente"}>
              <form className="form-grid" onSubmit={guardarCliente}>
                <Input label="Nombre" value={clienteForm.nombre} onChange={e=>setClienteForm({...clienteForm,nombre:e.target.value})} required/>
                <Input label="Teléfono" value={clienteForm.telefono} onChange={e=>setClienteForm({...clienteForm,telefono:e.target.value})} required/>
                <Input label="Correo electrónico" type="email" value={clienteForm.correo} onChange={e=>setClienteForm({...clienteForm,correo:e.target.value})} required/>
                <div className="field-submit">
                  <Button type="submit">{clienteForm.id?"Actualizar":"Guardar"}</Button>
                  {clienteForm.id && <Button variant="ghost" onClick={()=>setClienteForm(emptyCliente)}>Cancelar</Button>}
                </div>
              </form>
            </Card>
            <Card title="Clientes registrados">
              <Table headers={["Nombre","Teléfono","Correo","Acciones"]} empty="No hay clientes registrados.">
                {clientes.map(c=>(
                  <tr key={c.id}>
                    <Td strong>{c.nombre}<small>ID {c.id}</small></Td>
                    <Td>{c.telefono}</Td>
                    <Td>{c.correo}</Td>
                    <Td className="td-actions">
                      <Button variant="ghost" onClick={()=>editCliente(c)}>Editar</Button>
                      {esAdmin && <Button variant="danger" onClick={()=>eliminar("clientes",c.id)}>Eliminar</Button>}
                    </Td>
                  </tr>
                ))}
              </Table>
            </Card>
          </>
        )}

        {tab==="dispositivos" && (
          <>
            <Card title={dispositivoForm.id?"Editar dispositivo":"Nuevo dispositivo"}>
              <form className="form-grid" onSubmit={guardarDispositivo}>
                <Select label="Cliente" value={dispositivoForm.cliente_id} onChange={e=>setDispositivoForm({...dispositivoForm,cliente_id:e.target.value})} required>
                  <option value="">Selecciona un cliente</option>
                  {clientes.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                </Select>
                <Input label="Marca" value={dispositivoForm.marca} onChange={e=>setDispositivoForm({...dispositivoForm,marca:e.target.value})} required/>
                <Input label="Modelo" value={dispositivoForm.modelo} onChange={e=>setDispositivoForm({...dispositivoForm,modelo:e.target.value})} required/>
                <Input label="Número de serie" value={dispositivoForm.numero_serie} onChange={e=>setDispositivoForm({...dispositivoForm,numero_serie:e.target.value})}/>
                <Input label="Falla reportada" value={dispositivoForm.falla} onChange={e=>setDispositivoForm({...dispositivoForm,falla:e.target.value})} required/>
                <div className="field-submit">
                  <Button type="submit">{dispositivoForm.id?"Actualizar":"Guardar"}</Button>
                  {dispositivoForm.id && <Button variant="ghost" onClick={()=>setDispositivoForm(emptyDispositivo)}>Cancelar</Button>}
                </div>
              </form>
            </Card>
            <Card title="Dispositivos registrados">
              <Table headers={["Cliente","Equipo","Serie","Falla","Acciones"]} empty="No hay dispositivos registrados.">
                {dispositivos.map(d=>(
                  <tr key={d.id}>
                    <Td strong>{d.cliente_nombre}</Td>
                    <Td>{d.marca} {d.modelo}</Td>
                    <Td muted>{d.numero_serie||"—"}</Td>
                    <Td>{d.falla}</Td>
                    <Td className="td-actions">
                      <Button variant="ghost" onClick={()=>editDispositivo(d)}>Editar</Button>
                      {esAdmin && <Button variant="danger" onClick={()=>eliminar("dispositivos",d.id)}>Eliminar</Button>}
                    </Td>
                  </tr>
                ))}
              </Table>
            </Card>
          </>
        )}

        {tab==="reparaciones" && (
          <>
            <Card title={reparacionForm.id?"Editar orden":"Nueva orden de reparación"}>
              <form className="form-grid" onSubmit={guardarReparacion}>
                <Select label="Dispositivo" value={reparacionForm.dispositivo_id} onChange={e=>setReparacionForm({...reparacionForm,dispositivo_id:e.target.value})} required>
                  <option value="">Selecciona un dispositivo</option>
                  {dispositivos.map(d=><option key={d.id} value={d.id}>{d.cliente_nombre} — {d.marca} {d.modelo}</option>)}
                </Select>
                <Select label="Estado" value={reparacionForm.estado} onChange={e=>setReparacionForm({...reparacionForm,estado:e.target.value})}>
                  {ESTADOS.map(e=><option key={e}>{e}</option>)}
                </Select>
                <Input label="Costo estimado" type="number" min="0" step="0.01" value={reparacionForm.costo_estimado} onChange={e=>setReparacionForm({...reparacionForm,costo_estimado:e.target.value})}/>
                <Input label="Costo final" type="number" min="0" step="0.01" value={reparacionForm.costo_final} onChange={e=>setReparacionForm({...reparacionForm,costo_final:e.target.value})}/>
                <Input label="Anticipo" type="number" min="0" step="0.01" value={reparacionForm.anticipo} onChange={e=>setReparacionForm({...reparacionForm,anticipo:e.target.value})}/>
                <Input label="Entrega estimada" type="date" value={reparacionForm.fecha_estimada_entrega} onChange={e=>setReparacionForm({...reparacionForm,fecha_estimada_entrega:e.target.value})}/>
                <TextArea label="Descripción" value={reparacionForm.descripcion} onChange={e=>setReparacionForm({...reparacionForm,descripcion:e.target.value})}/>
                <TextArea label="Diagnóstico" value={reparacionForm.diagnostico} onChange={e=>setReparacionForm({...reparacionForm,diagnostico:e.target.value})}/>
                <div className="field-submit full-row">
                  <Button type="submit">{reparacionForm.id?"Actualizar":"Crear orden"}</Button>
                  {reparacionForm.id && <Button variant="ghost" onClick={()=>setReparacionForm(emptyReparacion)}>Cancelar</Button>}
                </div>
              </form>
            </Card>
            <Card title="Órdenes de reparación" right={<Badge estado={`${repFiltradas.length} registros`}/>}>
              <div className="filters">
                <Input value={busqueda} onChange={e=>setBusqueda(e.target.value)} placeholder="Buscar por folio, cliente o equipo"/>
                <Select value={filtroEstado} onChange={e=>setFiltroEstado(e.target.value)}>
                  <option>Todos</option>
                  {ESTADOS.map(e=><option key={e}>{e}</option>)}
                </Select>
              </div>
              <Table headers={["Folio","Cliente","Equipo","Estado","Pago","Acciones"]} empty="No hay órdenes con esos filtros.">
                {repFiltradas.map(r=>(
                  <tr key={r.id}>
                    <Td strong>{r.folio}<small>{dateFmt(r.fecha_ingreso)}</small></Td>
                    <Td>{r.cliente_nombre}<small>{r.telefono}</small></Td>
                    <Td>{r.marca} {r.modelo}<small>{r.falla}</small></Td>
                    <Td><Badge estado={r.estado}/></Td>
                    <Td strong>{money(saldoPendiente(r))}<small>Total {money(r.costo_final)} · Anticipo {money(r.anticipo)}</small></Td>
                    <Td className="td-actions actions-wide">
                      <select className="mini-select" value={r.estado} onChange={e=>cambiarEstado(r.id,e.target.value)}>
                        {ESTADOS.map(e=><option key={e}>{e}</option>)}
                      </select>
                      <Button variant="ghost" onClick={()=>editReparacion(r)}>Editar</Button>
                      {r.estado==="Listo para entregar" && (
                        <Button variant="success" onClick={()=>enviarCorreo(r.id)}>{r.notificado?"Reenviar aviso":"Enviar aviso"}</Button>
                      )}
                      {esAdmin && <Button variant="danger" onClick={()=>eliminar("reparaciones",r.id)}>Eliminar</Button>}
                    </Td>
                  </tr>
                ))}
              </Table>
            </Card>
          </>
        )}

        {tab==="reportes" && esAdmin && reportes && (
          <>
            <div className="stats-grid">
              <Stat label="Ganancias totales" value={money(reportes.resumen.ganancias_totales)}/>
              <Stat label="Ganancias del mes" value={money(reportes.resumen.ganancias_mes)}/>
              <Stat label="Saldo pendiente" value={money(reportes.resumen.saldo_pendiente)}/>
              <Stat label="Entregadas" value={reportes.resumen.entregadas}/>
            </div>
            <div className="two-columns">
              <Card title="Reparaciones por estado">
                <Table headers={["Estado","Total"]} empty="Sin datos.">
                  {reportes.por_estado.map(e=><tr key={e.estado}><Td><Badge estado={e.estado}/></Td><Td strong>{e.total}</Td></tr>)}
                </Table>
              </Card>
              <Card title="Servicios más comunes">
                <Table headers={["Falla registrada","Total"]} empty="Sin datos.">
                  {reportes.servicios_comunes.map((s,i)=><tr key={i}><Td>{s.falla}</Td><Td strong>{s.total}</Td></tr>)}
                </Table>
              </Card>
            </div>
          </>
        )}

        {tab==="usuarios" && esAdmin && (
          <>
            <Card title={usuarioForm.id?"Editar usuario":"Nuevo usuario"}>
              <form className="form-grid" onSubmit={guardarUsuario}>
                <Input label="Nombre" value={usuarioForm.nombre} onChange={e=>setUsuarioForm({...usuarioForm,nombre:e.target.value})} required/>
                <Input label="Usuario" value={usuarioForm.usuario} onChange={e=>setUsuarioForm({...usuarioForm,usuario:e.target.value})} required/>
                {!usuarioForm.id && <Input label="Contraseña" type="password" value={usuarioForm.password} onChange={e=>setUsuarioForm({...usuarioForm,password:e.target.value})} required/>}
                <Select label="Rol" value={usuarioForm.rol} onChange={e=>setUsuarioForm({...usuarioForm,rol:e.target.value})}>
                  <option value="empleado">Técnico</option>
                  <option value="admin">Administrador</option>
                </Select>
                <div className="field-submit">
                  <Button type="submit">{usuarioForm.id?"Actualizar":"Crear"}</Button>
                  {usuarioForm.id && <Button variant="ghost" onClick={()=>setUsuarioForm(emptyUsuario)}>Cancelar</Button>}
                </div>
              </form>
            </Card>
            <Card title="Usuarios del sistema">
              <Table headers={["Nombre","Usuario","Rol","Estado","Acciones"]} empty="No hay usuarios.">
                {usuarios.map(u=>(
                  <tr key={u.id}>
                    <Td strong>{u.nombre}</Td>
                    <Td>{u.usuario}</Td>
                    <Td>{u.rol==="admin"?"Administrador":"Técnico"}</Td>
                    <Td><span className={u.activo?"status-dot active":"status-dot inactive"}>{u.activo?"Activo":"Desactivado"}</span></Td>
                    <Td className="td-actions actions-wide">
                      <Button variant="ghost" onClick={()=>editUsuario(u)}>Editar</Button>
                      <Button variant="warning" onClick={()=>cambiarPassword(u.id)}>Cambiar contraseña</Button>
                      <Button variant="danger" onClick={()=>cambiarEstadoUsuario(u)}>{u.activo?"Desactivar":"Activar"}</Button>
                    </Td>
                  </tr>
                ))}
              </Table>
            </Card>
          </>
        )}

        {tab==="portal" && <Card title="Portal del cliente"><PortalCliente/></Card>}
      </main>
    </div>
  );
}
