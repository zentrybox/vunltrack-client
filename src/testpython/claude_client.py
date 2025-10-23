import re
import anthropic
from typing import List, Dict
from ..models.schemas import CVE, VulnerabilityAnalysis
from ..utils.config_loader import load_api_keys

class ClaudeClient:
    """
    Cliente para la API de Anthropic Claude
    """
    
    def __init__(self):
        self.api_key = self._load_claude_api_key()
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.model = "claude-3-haiku-20240307"
    
    def _load_claude_api_key(self) -> str:
        """Carga API key de Claude"""
        api_keys = load_api_keys()
        return api_keys.get('anthropic', {}).get('api_key', '')
    
    def analyze_vulnerabilities(self, vendor: str, product: str, version: str, cves: List[CVE]) -> VulnerabilityAnalysis:
        """
        Analiza vulnerabilidades usando Claude
        """
        prompt = self._build_analysis_prompt(vendor, product, version, cves)
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1000,
                temperature=0.3,
                messages=[{
                    "role": "user", 
                    "content": prompt
                }]
            )
            
            return self._parse_claude_response(response.content[0].text, cves)
            
        except Exception as e:
            print(f"❌ Error en Claude API: {e}")
            return VulnerabilityAnalysis(
                risk_level="UNKNOWN",
                summary="Error en el análisis",
                recommendations=["Revisar configuración de API"],
                priority_actions=[]
            )
    
    def _build_analysis_prompt(self, vendor: str, product: str, version: str, cves: List[CVE]) -> str:
        """Construye el prompt para Claude"""
        return f"""
Eres un experto en ciberseguridad especializado en dispositivos de red. 
Analiza estas vulnerabilidades y proporciona recomendaciones accionables.

CONTEXTO:
- Dispositivo: {vendor} {product} {version}
- Total de vulnerabilidades: {len(cves)}

VULNERABILIDADES ENCONTRADAS:
{self._format_cves_for_analysis(cves)}

INSTRUCCIONES DE ANÁLISIS:
1. Evalúa el nivel de riesgo general (CRÍTICO, ALTO, MEDIO, BAJO)
2. Identifica las 3 vulnerabilidades más críticas
3. Proporciona recomendaciones específicas de mitigación
4. Sugiere un plan de acción priorizado
5. Considera el impacto en entornos productivos

Formato de respuesta:
- RESUMEN: [Análisis general del riesgo]
- RECOMENDACIONES: [Lista numerada de acciones]
- PRIORIDADES: [Vulnerabilidades a atender primero]
- IMPACTO: [Posible impacto en negocio]
"""
    
    def _format_cves_for_analysis(self, cves: List[CVE]) -> str:
        """Formatea CVEs para el análisis"""
        formatted = []
        for cve in cves:
            formatted.append(
                f"- {cve.cve_id} ({cve.severity}) - CVSS: {cve.cvss_score or 'N/A'}\n"
                f"  Descripción: {cve.summary[:300]}..."
            )
        return "\n".join(formatted)
    
    def _parse_claude_response(self, response_text: str, cves: List[CVE]) -> VulnerabilityAnalysis:
        resumen = ""
        recomendaciones = []
        prioridad = []
        
        if "RESUMEN:" in response_text:
            resumen = response_text.split("RESUMEN:")[1].split("RECOMENDACIONES:")[0].strip()
        else:
            resumen = response_text[:400]
        resumen = resumen[:400] + "..." if len(resumen) > 400 else resumen

        nivel_match = re.search(r"(CRÍTICO|ALTO|MEDIO|BAJO)", resumen, re.IGNORECASE)
        if nivel_match:
            risk_level = nivel_match.group(1).upper()
        else:
            risk_level = "ALTO" if any(c.severity in ["CRITICAL", "HIGH"] for c in cves) else "MEDIO"

        if "RECOMENDACIONES:" in response_text:
            rec_text = response_text.split("RECOMENDACIONES:")[1]
            if "PRIORIDADES:" in rec_text:
                rec_text = rec_text.split("PRIORIDADES:")[0]
            recomendaciones = [re.sub(r"^[0-9]+\\.\\s*", "", line.strip("-•. ")).strip() for line in rec_text.splitlines() if line.strip()]
        if not recomendaciones:
            recomendaciones = ["Actualizar el sistema", "Configurar seguridad básica", "Monitorear actividad"]
            
        if "PRIORIDADES:" in response_text:
            prio_text = response_text.split("PRIORIDADES:")[1]
            if "IMPACTO:" in prio_text:
                prio_text = prio_text.split("IMPACTO:")[0]
            prioridad = [line.strip("-•. ") for line in prio_text.splitlines() if line.strip()][:3]
        if not prioridad:
            prioridad = [cve.cve_id for cve in cves if cve.severity in ["CRITICAL", "HIGH"]][:3]
            
        return VulnerabilityAnalysis(
            risk_level=risk_level,
            summary=resumen,
            recommendations=recomendaciones,
            priority_actions=prioridad
        )