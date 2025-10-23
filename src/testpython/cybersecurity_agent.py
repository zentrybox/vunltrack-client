import time
from typing import Dict, List
from src.clients.nvd_client import NVDClient
from src.clients.claude_client import ClaudeClient
from src.models.schemas import CVE, VulnerabilityRequest, VulnerabilityAnalysis, AgentResponse
from src.utils.validators import validate_vulnerability_request


class CybersecurityAgent:
    """
    Agente principal de ciberseguridad
    Orquesta el flujo completo de análisis de vulnerabilidades
    """
    
    def __init__(self):
        self.nvd_client = NVDClient()
        self.claude_client = ClaudeClient()
        self.analysis_history = []
    
    def analyze_device_vulnerabilities(self, vendor: str, product: str, version: str = "") -> AgentResponse:
        """
        Flujo completo de análisis:
        1. Validar entrada
        2. Consultar NVD
        3. Filtrar resultados  
        4. Analizar con Claude
        5. Generar respuesta
        """
        try:
            # 1. Validación
            print("🔍 Validando datos de entrada...")
            validation_result = validate_vulnerability_request(vendor, product, version)
            if not validation_result["valid"]:
                return AgentResponse(
                    success=False,
                    message="Error de validación",
                    error=validation_result["error"],
                    data=None
                )
            
            print(f"🎯 Analizando: {vendor} {product} {version}")
            
            print("🔄 Consultando base de datos NVD...")
            cves = self.nvd_client.search_vulnerabilities(product, vendor)
            
            if not cves:
                return AgentResponse(
                    success=True,
                    message="No se encontraron vulnerabilidades",
                    data={
                        "vendor": vendor,
                        "product": product,
                        "version": version,
                        "total_vulnerabilities": 0,
                        "filtered_vulnerabilities": 0,
                        "vulnerabilities": [],
                        "analysis": None
                    }
                )
            
            print(f"📊 Encontradas {len(cves)} vulnerabilidades")
            
            if version:
                filtered_cves = self.nvd_client._filter_by_exact_version(cves, version)
                print(f"📋 Después del filtrado: {len(filtered_cves)} vulnerabilidades")
            else:
                filtered_cves = cves
            
            # 4. Analizar con Claude
            if filtered_cves:
                print("🧠 Consultando a Claude para análisis...")
                analysis = self.claude_client.analyze_vulnerabilities(
                    vendor, product, version, filtered_cves
                )
            else:
                analysis = VulnerabilityAnalysis(
                    risk_level="BAJO",
                    summary="No se encontraron vulnerabilidades para la versión específica.",
                    recommendations=[
                        "El dispositivo parece estar seguro para la versión analizada",
                        "Mantener actualizaciones regulares",
                        "Monitorear nuevos anuncios de seguridad"
                    ],
                    priority_actions=[]
                )
            
            # 5. Guardar en historial
            self.analysis_history.append({
                "vendor": vendor,
                "product": product, 
                "version": version,
                "timestamp": time.time(),
                "total_vulnerabilities": len(cves),
                "filtered_vulnerabilities": len(filtered_cves)
            })
            
            # 6. Preparar respuesta
            return AgentResponse(
                success=True,
                message=f"Análisis completado para {vendor} {product}",
                data={
                    "vendor": vendor,
                    "product": product,
                    "version": version,
                    "total_vulnerabilities": len(cves),
                    "filtered_vulnerabilities": len(filtered_cves),
                    "vulnerabilities": filtered_cves,
                    "analysis": analysis
                }
            )
            
        except Exception as e:
            return AgentResponse(
                success=False,
                message="Error durante el análisis",
                error=f"Error durante el análisis: {str(e)}",
                data=None
            )
    
    def get_analysis_history(self) -> List[Dict]:
        """Obtiene historial de análisis"""
        return self.analysis_history
    
    def clear_history(self):
        """Limpia el historial"""
        self.analysis_history.clear()