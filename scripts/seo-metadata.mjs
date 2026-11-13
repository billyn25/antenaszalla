import guides from '../content/service-guides.json' with {type:'json'};
import services from '../content/services.json' with {type:'json'};

export const SEO_BRAND = 'Antenas Zalla';
export const SEO_PHONE = '670 042 626';

// Editorial budgets, not Google limits. A place name is never cut to fit them.
const BRANDED_TITLE_BUDGET = 65;
const DESCRIPTION_BUDGET = 160;

function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} debe contener texto`);
  return value.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

export function displayPlaceName(name) {
  const value = requiredText(name, 'El nombre de la localidad');
  const invertedArticle = value.match(/^(.+),\s*(El|La|Los|Las)$/iu);
  if (!invertedArticle) return value;
  const article = invertedArticle[2].toLocaleLowerCase('es');
  return `${article[0].toLocaleUpperCase('es')}${article.slice(1)} ${invertedArticle[1]}`;
}

function brandedTitle(subject) {
  const title = `${subject} | ${SEO_BRAND}`;
  return title.length <= BRANDED_TITLE_BUDGET ? title : subject;
}

function samePlace(a, b) {
  return a.localeCompare(b, 'es', {sensitivity:'base'}) === 0;
}

function emergencyIsStated({urgent, urgentLabel}) {
  return urgent === true || (typeof urgentLabel === 'string' && /\b24\s*(?:h|horas)\b/iu.test(urgentLabel));
}

/** Returns plain text. Renderers remain responsible for HTML escaping. */
export function townSeoMetadata(town) {
  const name = displayPlaceName(town.name);
  const province = town.province ? displayPlaceName(town.province) : '';
  if (town.disambiguate && !province) throw new TypeError('La provincia es necesaria para distinguir municipios homónimos');
  const location = province && !samePlace(name, province) ? `${name}, ${province}` : name;
  const titleLocation = town.disambiguate ? location : name;
  const contact = emergencyIsStated(town)
    ? `Urgencias 24 h: ${SEO_PHONE}.`
    : `Consulta disponibilidad: ${SEO_PHONE}.`;
  let description = `Antenista en ${location}. TDT, parabólicas, porteros y videoporteros para viviendas y comunidades. ${contact}`;
  if (description.length > DESCRIPTION_BUDGET) {
    // Long names keep the full locality and the services, without filler or clipping.
    description = `Antenas TDT, parabólicas, porteros y videoporteros en ${titleLocation}. ${contact}`;
  }
  return {
    title: brandedTitle(`Antenista en ${titleLocation}`),
    description,
    heading: `Antenista en ${titleLocation}`
  };
}

export function provinceSeoMetadata(provinceName) {
  const name = displayPlaceName(provinceName);
  const description = `Antenista en ${name} y sus municipios. Instalación y reparación de TDT, parabólicas, porteros y videoporteros. Consulta tu localidad: ${SEO_PHONE}.`;
  return {
    title: brandedTitle(`Antenista en ${name} y sus municipios`),
    description,
    heading: `Antenista en ${name}: servicios y municipios atendidos`
  };
}

export function homeSeoMetadata() {
  return {
    title: `${SEO_BRAND} | Antenas, porteros y videoporteros`,
    description: `${SEO_BRAND}: instalación y reparación de antenas TDT, parabólicas, porteros y videoporteros. Urgencias 24 h. Consulta tu localidad: ${SEO_PHONE}.`,
    heading: 'Antenas, porteros y videoporteros desde Zalla'
  };
}

const serviceCopy = {
  tdt: {
    subject: 'Reparación e instalación de antenas TDT',
    description: 'Localizamos cortes, pixelaciones y pérdida de canales TDT. Revisamos antena, alimentación, cableado y tomas antes de plantear recambios.'
  },
  porteros: {
    subject: 'Reparación de porteros automáticos',
    description: 'Revisamos llamada, audio y apertura del portero automático. Identificamos placa, fuente y telefonillo antes de reparar o renovar el sistema.'
  },
  videoporteros: {
    subject: 'Instalación y reparación de videoporteros',
    description: 'Revisión de cámara, monitor y alimentación del videoportero. Comprobamos compatibilidad y cableado para reparar la avería o renovar la instalación.'
  },
  parabolicas: {
    subject: 'Instalación y orientación de parabólicas',
    description: 'Instalación y ajuste de antenas parabólicas. Medimos la recepción y revisamos soporte, LNB, conectores y cableado para localizar la pérdida de señal.'
  },
  'tdt-satelite': {
    subject: 'TDT por satélite HD: instalación y revisión',
    description: 'Valoramos la recepción TDT por satélite HD cuando la señal terrestre no basta. Instalación y revisión sujetas a elegibilidad y activación del sistema.'
  },
  starlink: {
    subject: 'Montaje e instalación de Starlink',
    description: 'Montaje físico de Starlink: ubicación despejada, soporte, paso de cable y comprobación inicial. El kit, la cuenta y la tarifa se concretan por separado.'
  },
  amplificacion: {
    subject: 'Amplificadores de antena y distribución de TV',
    description: 'Revisión de amplificadores, fuentes y centrales de antena. Comparamos nivel y calidad de señal para ajustar la cabecera y el reparto hasta las tomas.'
  },
  'cobertura-movil-servicio': {
    subject: 'Antenas para router 4G y 5G',
    description: 'Comprobamos señal exterior, bandas y conexiones antes de instalar una antena para router 4G o 5G. Ubicación, cableado y cobertura wifi se valoran aparte.'
  },
  tomas: {
    subject: 'Tomas y cableado de televisión',
    description: 'Instalación de tomas de televisión y revisión del cableado. Localizamos pérdidas en conectores, repartidores y derivadores para recuperar la señal.'
  },
  mantenimiento: {
    subject: 'Antenas y porteros para comunidades',
    description: 'Antenas colectivas, porteros y videoporteros para comunidades de vecinos. Diagnóstico, reparación y renovación coordinados con presidente o administrador.'
  }
};

function serviceKey(value) {
  return requiredText(value, 'El servicio').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es');
}

const serviceAliases = new Map();
for (const guide of guides) {
  const service = services.find(item => item.id === guide.id);
  if (!service || !serviceCopy[guide.id]) throw new Error(`Falta redacción SEO para el servicio ${guide.id}`);
  for (const alias of [guide.id, guide.slug, guide.name, guide.label, service.name, `/servicios/${guide.slug}/`]) {
    serviceAliases.set(serviceKey(alias), guide);
  }
}
if (guides.length !== services.length || guides.length !== Object.keys(serviceCopy).length) {
  throw new Error('El catálogo SEO debe corresponder a los servicios publicados');
}

export function serviceSeoMetadata(service) {
  const candidates = typeof service === 'string' ? [service] : [service?.id, service?.slug, service?.name, service?.label];
  const guide = candidates.filter(value => typeof value === 'string' && value.trim())
    .map(value => serviceAliases.get(serviceKey(value))).find(Boolean);
  if (!guide) throw new RangeError('Servicio desconocido: no se puede generar su metadato SEO');
  const copy = serviceCopy[guide.id];
  return {
    title: brandedTitle(copy.subject),
    description: copy.description,
    heading: guide.name
  };
}

export function serviceIndexSeoMetadata() {
  return {
    title: `Servicios de antenas y porteros | ${SEO_BRAND}`,
    description: `Servicios de ${SEO_BRAND}: TDT, parabólicas, amplificación, porteros y videoporteros. Consulta qué revisamos y cómo preparar el aviso: ${SEO_PHONE}.`,
    heading: 'Servicios de antenas, porteros y videoporteros'
  };
}

export function blogSeoMetadata(page = 1) {
  if (!Number.isInteger(page) || page < 1) throw new RangeError('La página del blog debe ser un entero positivo');
  return {
    title: page === 1 ? `Noticias de TDT y satélite | ${SEO_BRAND}` : `Noticias de TDT y satélite: página ${page} | ${SEO_BRAND}`,
    description: page === 1
      ? 'Noticias de TDT y satélite, cambios de canales y resintonización. Consulta las fuentes y las guías de Antenas Zalla para revisar tu instalación.'
      : `Página ${page} de noticias de TDT y satélite. Cambios de canales y avisos con fecha y enlace a la fuente original, por Antenas Zalla.`,
    heading: page === 1 ? 'Noticias de TDT, satélite y cambios de canales' : `Noticias de TDT y satélite: página ${page}`
  };
}
