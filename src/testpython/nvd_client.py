import requests
import time
from typing import Dict, List, Optional
from src.utils.config_loader import load_api_keys
from src.models.schemas import CVE, VulnerabilityRequest


class NVDClient:
    """
    Cliente especializado para la API del NVD (National Vulnerability Database)
    Maneja búsquedas por CPE, rate limiting y parsing de respuestas
    """
    
    def __init__(self):
        self.api_key = self._load_nvd_api_key()
        self.base_url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Cybersecurity-Agent/1.0 (Security Research)',
            'Accept': 'application/json'
        })
        
        self.last_request_time = 0
        self.min_request_interval = 1.0 
        
    def _load_nvd_api_key(self) -> str:
        """Carga API key del NVD desde archivo de configuración"""
        try:
            api_keys = load_api_keys()
            nvd_key = api_keys.get('nvd_api', {}).get('api_key', '')
            
            if nvd_key and nvd_key != "-----------------":
                print(f"✅ API Key de NVD cargada: {nvd_key[:8]}...")
                return nvd_key
            else:
                print("⚠️  No se encontró API Key de NVD, usando modo público (límites estrictos)")
                return ""
                
        except Exception as e:
            print(f"❌ Error cargando API key de NVD: {e}")
            return ""
    
    def _respect_rate_limit(self):
        """Respeta los límites de tasa de la API del NVD"""
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        
        if time_since_last_request < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last_request
            print(f"⏳ Respetando rate limit: esperando {sleep_time:.2f}s...")
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def search_vulnerabilities(self, product: str, vendor: str, version: str = "") -> List[CVE]:
        """Busca vulnerabilidades por vendor, product y version usando keywords"""
        try:
            keyword_query = f"{vendor} {product}"
                
            print(f"🔍 Buscando con keywords: '{keyword_query}'")
            
            params = {
                'keywordSearch': keyword_query,  # Usar keywordSearch en lugar de cpeName
                'resultsPerPage': 20
            }
            
            headers = {}
            if self.api_key:
                headers['apiKey'] = self.api_key
                
            print("⏳ Consultando NVD API...")
            
            response = self.session.get(
                self.base_url,
                params=params,
                headers=headers,
                timeout=15
            )
            
            print(f"📡 Status Code: {response.status_code}")
            
            if response.status_code == 200:
                return self._parse_response(response.json())
            elif response.status_code == 403:
                print("❌ Error 403: Acceso denegado. Verifica tu API Key")
                return []
            elif response.status_code == 404:
                print("❌ Error 404: Recurso no encontrado")
                return []
            elif response.status_code == 429:
                print("❌ Error 429: Límite de tasa excedido. Espera 30 segundos")
                time.sleep(30) 
                return []
            else:
                print(f"❌ Error API: {response.status_code} - {response.text}")
                return []
            
            if response.status_code == 200:
                return self._parse_response(response.json())
        
        except requests.exceptions.ConnectionError as e:
            print(f"❌ Error de conexión: {e}")
            return []
        except requests.exceptions.Timeout as e:
            print(f"❌ Timeout en la solicitud: {e}")
            return []
        except requests.exceptions.HTTPError as e:
            print(f"❌ Error HTTP: {e}")
            return []
        except Exception as e:
            print(f"❌ Error inesperado: {e}")
            return []
    
    def _build_cpe_string(self, vendor: str, product: str, version: str) -> str:
        """
        Construye una cadena CPE 2.3 válida con mejor detección de tipo
        """
        vendor_clean = vendor.lower().strip().replace(' ', '_')
        product_clean = product.lower().strip().replace(' ', '_')
        version_clean = version.strip() if version else '*'
        
        part = self._determine_cpe_part(vendor_clean, product_clean)
        
        version_clean = self._normalize_version(version_clean)
        
        cpe = f"cpe:2.3:{part}:{vendor_clean}:{product_clean}:{version_clean}:*:*:*:*:*:*:*"
        
        print(f"🔍 CPE generada: {cpe}")
        
        return cpe
    
    def _determine_cpe_part(self, vendor: str, product: str) -> str:
        """
        Determina la parte correcta del CPE basado en vendor y product
        
        Returns:
            'a' para aplicaciones, 'o' para sistemas operativos, 'h' para hardware
        """
        management_products = {
            'fortiweb', 'fortios', 'pan-os', 'gaia', 'firepower_management_center',
            'nexus_dashboard_orchestrator', 'security_management', 'web_application_firewall'
        }
        
        os_products = {'ios', 'ios_xe', 'ios_xr', 'junos', 'fortios', 'pan-os', 'gaia', 'routeros', 'vyos', 'esxi', 'esx', 'nx-os', 'windows_server', 'linux'}
        
        if product in os_products:
            return 'o' 
        elif product in management_products:
            return 'a'
        elif vendor in ['cisco', 'fortinet', 'paloaltonetworks', 'checkpoint']:
            return 'a'
        else:
            return 'a'
    
    def _normalize_version(self, version: str) -> str:
        """
        Normaliza versiones para el formato CPE
        """
        if not version or version == '*':
            return '*'
        
        version_clean = version.rstrip('.').strip()
        
        return version_clean
        
    def _parse_response(self, json_data: Dict) -> List[CVE]:
        """
        Parsea la respuesta JSON de la API del NVD a objetos CVE
        
        Args:
            json_data: Respuesta JSON de la API
            
        Returns:
            Lista de objetos CVE parseados
        """
        cves = []
        
        if 'vulnerabilities' not in json_data or not json_data['vulnerabilities']:
            print("ℹ️  No se encontraron vulnerabilidades en la respuesta")
            return cves
        
        total_results = json_data.get('totalResults', 0)
        print(f"📊 Total de resultados en API: {total_results}")
        
        for item in json_data['vulnerabilities']:
            cve_data = item.get('cve', {})
            
            cve_id = cve_data.get('id', '')
            if not cve_id:
                continue  
            cvss_score, severity = self._extract_cvss_info(cve_data.get('metrics', {}))
            
            description = self._extract_description(cve_data.get('descriptions', []))
            
            published_date = cve_data.get('published', '')[:10]
            
            references = self._extract_references(cve_data.get('references', []))
            
            cve = CVE(
                cve_id=cve_id,
                cvss_score=cvss_score,
                severity=severity,
                summary=description,
                published_date=published_date,
                vendor='',  
                product='',  
                version='', 
                references=references
            )
            
            cves.append(cve)
        
        cves.sort(key=lambda x: self._severity_to_numeric(x.severity), reverse=True)
        
        return cves
    
    def _extract_cvss_info(self, metrics: Dict) -> tuple:
        """
        Extrae información CVSS de las métricas, priorizando v3.1 > v3.0 > v2
        
        Returns:
            Tuple (cvss_score, severity)
        """
        cvss_score = None
        severity = "UNKNOWN"
        
        if 'cvssMetricV31' in metrics and metrics['cvssMetricV31']:
            cvss_data = metrics['cvssMetricV31'][0]['cvssData']
            cvss_score = cvss_data.get('baseScore')
            severity = metrics['cvssMetricV31'][0].get('baseSeverity', 'UNKNOWN')
            
        elif 'cvssMetricV30' in metrics and metrics['cvssMetricV30']:
            cvss_data = metrics['cvssMetricV30'][0]['cvssData']
            cvss_score = cvss_data.get('baseScore')
            severity = metrics['cvssMetricV30'][0].get('baseSeverity', 'UNKNOWN')
            
        elif 'cvssMetricV2' in metrics and metrics['cvssMetricV2']:
            cvss_data = metrics['cvssMetricV2'][0]['cvssData']
            cvss_score = cvss_data.get('baseScore')
            severity = self._cvss_v2_to_severity(cvss_score)
        
        return cvss_score, severity
    
    def _cvss_v2_to_severity(self, score: float) -> str:
        """Convierte puntaje CVSS v2 a severidad v3"""
        if not score:
            return "UNKNOWN"
        
        if score >= 9.0:
            return "CRITICAL"
        elif score >= 7.0:
            return "HIGH" 
        elif score >= 4.0:
            return "MEDIUM"
        else:
            return "LOW"
    
    def _extract_description(self, descriptions: List[Dict]) -> str:
        """Extrae la descripción en inglés de las descripciones disponibles"""
        for desc in descriptions:
            if desc.get('lang') == 'en':
                return desc.get('value', 'No description available')
        
        return "No description available"
    
    def _extract_references(self, references: List[Dict]) -> List[str]:
        """Extrae URLs de referencias útiles"""
        return [ref.get('url', '') for ref in references[:3]]  # Solo primeras 3
    
    def _severity_to_numeric(self, severity: str) -> int:
        """Convierte severidad textual a valor numérico para ordenamiento"""
        severity_map = {
            "CRITICAL": 4,
            "HIGH": 3, 
            "MEDIUM": 2,
            "LOW": 1,
            "UNKNOWN": 0
        }
        return severity_map.get(severity.upper(), 0)
    
    def _handle_http_error(self, error: Exception, status_code: int = None) -> str:
        """Maneja errores HTTP específicos de la API del NVD"""
        if status_code == 400:
            return "Solicitud mal formada - verificar parámetros CPE"
        elif status_code == 403:
            return "Acceso denegado - API key inválida o sin permisos"
        elif status_code == 404:
            return "Recurso no encontrado - verificar CPE"
        elif status_code == 429:
            return "Límite de tasa excedido - esperar antes de reintentar"
        elif status_code == 500:
            return "Error interno del servidor NVD"
        elif status_code == 503:
            return "Servicio no disponible - NVD en mantenimiento"
        else:
            return f"Error HTTP {status_code}: {str(error)}"
    
    def test_connection(self) -> bool:
        """
        Prueba la conexión con la API del NVD
        
        Returns:
            True si la conexión es exitosa, False en caso contrario
        """
        try:
            self._respect_rate_limit()
            
            params = {'startIndex': 0, 'resultsPerPage': 1}
            if self.api_key:
                params['apiKey'] = self.api_key
            
            response = self.session.get(self.base_url, params=params, timeout=10)
            
            if response.status_code == 200:
                print("✅ Conexión a NVD API exitosa!")
                return True
            else:
                print(f"❌ Error de conexión: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Error probando conexión: {e}")
            return False
    
    def get_cve_by_id(self, cve_id: str) -> Optional[CVE]:
        """
        Obtiene un CVE específico por su ID
        
        Args:
            cve_id: ID del CVE (ej: "CVE-2021-44228")
            
        Returns:
            Objeto CVE o None si no se encuentra
        """
        try:
            self._respect_rate_limit()
            
            params = {'cveId': cve_id}
            if self.api_key:
                params['apiKey'] = self.api_key
            
            response = self.session.get(self.base_url, params=params, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            cves = self._parse_response(data)
            
            return cves[0] if cves else None
            
        except Exception as e:
            print(f"❌ Error obteniendo CVE {cve_id}: {e}")
            return None
        
    def _filter_by_exact_version(self, cves: List[CVE], target_version: str) -> List[CVE]:
        """
        Filtra CVEs por versión exacta usando matching de patrones CPE
        """
        if not target_version:
            return cves
        
        filtered_cves = []
        
        for cve in cves:
            if self._version_matches_cpe_pattern(cve, target_version):
                filtered_cves.append(cve)
                
        print(f"🔍 Filtrado por versión '{target_version}': {len(filtered_cves)} de {len(cves)} CVEs coinciden")
        return filtered_cves
    
    def _version_matches_cpe_pattern(self, cve: CVE, target_version: str) -> bool:
        """
        Determina si el CVE afecta a la versión específica analizando patrones CPE
        """
        target_version_clean = target_version.lower().strip()
        
        summary_lower = cve.summary.lower()
        
        version_patterns = [
            f" {target_version_clean} ",
            f" {target_version_clean},",
            f" {target_version_clean}.",
            f"version {target_version_clean}",
            f"v{target_version_clean} ",
            f" {target_version_clean}\"",
            f"before {target_version_clean}",
            f"through {target_version_clean}",
            f"prior to {target_version_clean}"
        ]
        for pattern in version_patterns:
            if pattern in summary_lower:
                return True
        if target_version_clean in cve.cve_id.lower():
            return True
        
        return self._flexible_version_match(summary_lower, target_version_clean)
    
    def _flexible_version_match(self, summary: str, target_version: str) -> bool:
        """
        Matching flexible de versiones para casos donde no hay patrones exactos
        """
        version_parts = target_version.split('.')
        
        if len(version_parts) >= 2:
            major_minor = f"{version_parts[0]}.{version_parts[1]}"
            if major_minor in summary:
                return True
        
        if target_version in summary:
            return True
        
        for part in version_parts:
            if len(part) > 1 and part in summary:  
                return True
        
        return False
    
    def search_by_keyword(self, vendor: str, product: str, version: str = "") -> List[CVE]:
        """
        Búsqueda por keywords cuando la CPE exacta falla
        """
        try:
            self._respect_rate_limit()
            
            keyword_query = f"{vendor} {product}"
            
            if version:
                keyword_query += f" {version}"
                
                params = {
                    'keywordSearch': keyword_query,
                    'resultsPerPage': 50
                }
                
            if self.api_key:
                params['apiKey'] = self.api_key
                
            print(f"🔍 Búsqueda por keyword: {keyword_query}")
            response = self.session.get(self.base_url, params=params, timeout=30)
            
            if response.status_code == 200:
                return self._parse_response(response.json())
            else:
                print(f"❌ Error en búsqueda keyword: {response.status_code}")
                return []
        
        except Exception as e:
            print(f"❌ Error en búsqueda keyword: {e}")
            return []
        
        
    # Eliminar _parse_nvd_response, ya que _parse_response ya existe y retorna objetos CVE
        
    def _get_severity_from_cvss(self, score: float, v2: bool = False) -> str:
        """Convierte puntaje CVSS a severidad"""
        if not score:
            return "UNKNOWN"
        
        if v2:
            if score >= 7.0: return "HIGH"
            elif score >= 4.0: return "MEDIUM"
            else: return "LOW"
        else:
            if score >= 9.0: return "CRITICAL"
            elif score >= 7.0: return "HIGH"
            elif score >= 4.0: return "MEDIUMs"
            else: return "LOW"