"""
AGENTE DE CIBERSEGURIDAD - Analizador de Vulnerabilidades
Pide vendor, product, version → Consulta NVD → Analiza con Claude → Da recomendaciones
"""
import os
import sys
import time

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from agents.cybersecurity_agent import CybersecurityAgent
from utils.config_loader import load_api_keys


def mostrar_banner():
    """Muestra el banner del agente"""
    print("\n" + "="*70)
    print("🤖 AGENTE DE CIBERSEGURIDAD - ANALIZADOR DE VULNERABILIDADES")
    print("="*70)
    print("🔍 Busca vulnerabilidades en dispositivos de red")
    print("📊 Consulta la base de datos NVD (actualizada)")
    print("🧠 Analiza con Claude para recomendaciones inteligentes")
    print("💡 Genera planes de acción priorizados")
    print("="*70)


def verificar_configuracion():
    """Verifica que la configuración esté completa"""
    print("\n🔧 VERIFICANDO CONFIGURACIÓN...")
    
    api_keys = load_api_keys()
    
    # Verificar NVD API Key
    nvd_key = api_keys.get('nvd_api', {}).get('api_key', '')
    if not nvd_key or nvd_key == "-----------------":
        print("❌ ERROR: No está configurada la API Key del NVD")
        print("💡 Ve a config/api_keys.yaml y agrega tu API Key del NVD")
        print("   Obtén una en: https://nvd.nist.gov/developers/request-an-api-key")
        return False
    else:
        print("✅ NVD API Key: Configurada")
    
    # Verificar Claude API Key  
    claude_key = api_keys.get('anthropic', {}).get('api_key', '')
    if not claude_key or claude_key == "-----------------":
        print("❌ ERROR: No está configurada la API Key de Claude")
        print("💡 Ve a config/api_keys.yaml y agrega tu API Key de Anthropic")
        print("   Obtén una en: https://console.anthropic.com/")
        return False
    else:
        print("✅ Claude API Key: Configurada")
    
    print("✅ Configuración verificada correctamente!")
    return True


def obtener_datos_usuario():
    """Pide al usuario los datos del dispositivo a analizar"""
    print("\n📝 INGRESA LOS DATOS DEL DISPOSITIVO DE RED")
    print("-" * 50)
    
    while True:
        try:
            # Vendor
            vendor = input("\n🏢 Ingresa el VENDOR (ej: cisco, fortinet, paloaltonetworks): ").strip()
            if not vendor:
                print("❌ El vendor no puede estar vacío")
                continue
                
            # Product
            product = input("🖥️  Ingresa el PRODUCTO (ej: asa, fortios, pan-os): ").strip() 
            if not product:
                print("❌ El producto no puede estar vacío")
                continue
                
            # Version (opcional)
            version = input("🔢 Ingresa la VERSIÓN (opcional - ej: 9.16.1, 7.2.0): ").strip()
            
            # Confirmar
            print(f"\n🎯 ¿Analizar este dispositivo?")
            print(f"   Vendor: {vendor}")
            print(f"   Producto: {product}")
            print(f"   Versión: {version if version else 'No especificada'}")
            
            confirmar = input("\n¿Continuar? (s/n): ").strip().lower()
            if confirmar in ['s', 'si', 'sí', 'y', 'yes']:
                return vendor, product, version
            else:
                print("↩️  Volviendo a ingresar datos...")
                
        except KeyboardInterrupt:
            print("\n\n👋 Ejecución interrumpida por el usuario")
            sys.exit(0)
        except Exception as e:
            print(f"❌ Error: {e}")


def mostrar_resultados(resultado):
    
    data = resultado.data
    
    formato = input("\n¿Desea guardar el reporte? (json/pdf/n): ").strip().lower()
    if formato == "json":
        guardar_reporte_json(data)
        print("✅ Reporte guardado en formato JSON.")
    elif formato == "pdf":
        guardar_reporte_pdf(data)
        print("✅ Reporte guardado en formato PDF.")
    else:
        print("No se guardó el reporte.")
    """Muestra los resultados del análisis de forma organizada"""
    print("\n" + "="*70)
    print("📊 RESULTADOS DEL ANÁLISIS")
    print("="*70)
    
    if not resultado.success:
        print(f"❌ ERROR: {resultado.error}")
        return

    print(f"🏢 Dispositivo: {data['vendor']} {data['product']} {data['version']}")
    print(f"📈 Vulnerabilidades encontradas: {data['total_vulnerabilities']}")
    
    if data['filtered_vulnerabilities'] > 0:
        print(f"🔍 Después de filtrado: {data['filtered_vulnerabilities']}")
    
    # Análisis de Claude
    if data['analysis']:
        analisis = data['analysis']
        
        print(f"\n🚨 NIVEL DE RIESGO: {analisis.risk_level}")
        
        # Mostrar resumen
        print(f"\n📋 RESUMEN DEL ANÁLISIS:")
        print(f"   {analisis.summary}")
        
        # Recomendaciones
        print(f"\n💡 RECOMENDACIONES:")
        for i, recomendacion in enumerate(analisis.recommendations, 1):
            print(f"   {i}. {recomendacion}")
        
        # Acciones prioritarias
        if analisis.priority_actions:
            print(f"\n⚡ ACCIONES PRIORITARIAS:")
            for accion in analisis.priority_actions:
                print(f"   • {accion}")
    
    # Mostrar vulnerabilidades críticas/altas
    if data['vulnerabilities']:
        vulnerabilidades_criticas = [v for v in data['vulnerabilities'] if v.severity in ['CRITICAL', 'HIGH']]
        print("\n🔎 CVEs filtrados para la versión:")
        for vuln in data['vulnerabilities']:
            print(f"   - {vuln.cve_id} | {vuln.severity} | CVSS: {vuln.cvss_score or 'N/A'}")
            print(f"     {vuln.summary[:200]}...")
        if vulnerabilidades_criticas:
            print(f"\n🔴 VULNERABILIDADES CRÍTICAS/ALTAS ({len(vulnerabilidades_criticas)}):")
            for vuln in vulnerabilidades_criticas[:5]:  # Mostrar máximo 5
                print(f"\n   🚨 {vuln.cve_id} - {vuln.severity}")
                if vuln.cvss_score:
                    print(f"      ⚡ CVSS: {vuln.cvss_score}")
                print(f"      📅 Publicado: {vuln.published_date}")
                print(f"      📝 {vuln.summary[:100]}...")
        
        # Estadísticas por severidad
        stats = {}
        for vuln in data['vulnerabilities']:
            stats[vuln.severity] = stats.get(vuln.severity, 0) + 1
        
        print(f"\n📊 ESTADÍSTICAS POR SEVERIDAD:")
        for severity in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']:
            if severity in stats:
                print(f"   {severity}: {stats[severity]} vulnerabilidades")


def mostrar_ejemplos():
    """Muestra ejemplos de búsquedas comunes"""
    print("\n💡 EJEMPLOS DE BÚSQUEDAS COMUNES:")
    print("   • cisco / asa / 9.16.1")
    print("   • fortinet / fortios / 7.2.0") 
    print("   • paloaltonetworks / pan-os / 10.2.3")
    print("   • juniper / junos / 21.4R1")
    print("   • checkpoint / gaia / r81")
    print("   • mikrotik / routeros / 7.12")

def guardar_reporte_json(data):
    import json
    from datetime import datetime
    nombre = f"reporte_vulntrack_{data['vendor']}_{data['product']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(nombre, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def guardar_reporte_pdf(data):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from datetime import datetime

    nombre = f"reporte_vulntrack_{data['vendor']}_{data['product']}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    doc = SimpleDocTemplate(nombre, pagesize=A4)
    styles = getSampleStyleSheet()
    story = []

    # Título principal
    style_title = ParagraphStyle('title', fontSize=22, alignment=1, spaceAfter=16, textColor=colors.HexColor('#1a237e'))
    story.append(Paragraph("VulnTrack - Reporte de Vulnerabilidades", style_title))

    # Fecha y hora
    style_date = ParagraphStyle('date', fontSize=12, alignment=1, spaceAfter=12, textColor=colors.HexColor('#616161'))
    fecha = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
    story.append(Paragraph(f"Fecha de emisión: {fecha}", style_date))
    story.append(Spacer(1, 12))

    # Información del dispositivo
    style_section = ParagraphStyle('section', fontSize=14, spaceAfter=8, textColor=colors.HexColor('#0d47a1'))
    story.append(Paragraph("Información del dispositivo analizado", style_section))
    info = f"<b>Vendor:</b> {data['vendor']}<br/><b>Producto:</b> {data['product']}<br/><b>Versión:</b> {data['version']}"
    story.append(Paragraph(info, styles['Normal']))
    story.append(Spacer(1, 8))

    # Resumen y nivel de riesgo
    analisis = data.get('analysis')
    if analisis:
        story.append(Paragraph("Resumen del análisis", style_section))
        story.append(Paragraph(f"<b>Nivel de riesgo:</b> {analisis.risk_level}", styles['Normal']))
        story.append(Paragraph(f"<b>Resumen:</b> {analisis.summary}", styles['Normal']))
        story.append(Spacer(1, 8))
        story.append(Paragraph("Recomendaciones", style_section))
        for i, rec in enumerate(analisis.recommendations, 1):
            story.append(Paragraph(f"{i}. {rec}", styles['Normal']))
        story.append(Spacer(1, 8))
        if analisis.priority_actions:
            story.append(Paragraph("Acciones prioritarias", style_section))
            for accion in analisis.priority_actions:
                story.append(Paragraph(f"• {accion}", styles['Normal']))
            story.append(Spacer(1, 8))

    # Tabla de CVEs filtrados
    story.append(Paragraph("CVEs filtrados para la versión", style_section))
    cve_data = [["CVE ID", "Severidad", "CVSS", "Resumen"]]
    for vuln in data['vulnerabilities']:
        cve_data.append([
            vuln.cve_id,
            vuln.severity,
            str(vuln.cvss_score) if vuln.cvss_score else "N/A",
            vuln.summary[:180] + ("..." if len(vuln.summary) > 180 else "")
        ])
    table = Table(cve_data, colWidths=[80, 60, 40, 300])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#1976d2')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (1,1), (-1,-1), [colors.whitesmoke, colors.lightgrey]),
    ]))
    story.append(table)
    story.append(Spacer(1, 12))

    # Estadísticas por severidad
    stats = {}
    for vuln in data['vulnerabilities']:
        stats[vuln.severity] = stats.get(vuln.severity, 0) + 1
    story.append(Paragraph("Estadísticas por severidad", style_section))
    for severity in ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN']:
        if severity in stats:
            story.append(Paragraph(f"{severity}: {stats[severity]} vulnerabilidades", styles['Normal']))
    story.append(Spacer(1, 16))

    # Pie de página
    style_footer = ParagraphStyle('footer', fontSize=10, alignment=1, textColor=colors.HexColor('#757575'))
    story.append(Paragraph("Reporte generado automáticamente por VulnTrack", style_footer))

    doc.build(story)

def main():
    """Función principal del agente"""
    try:
        # Mostrar banner
        mostrar_banner()
        
        # Verificar configuración
        if not verificar_configuracion():
            return
        
        # Mostrar ejemplos
        mostrar_ejemplos()
        
        # Inicializar agente
        print("\n🔄 INICIALIZANDO AGENTE...")
        agente = CybersecurityAgent()
        
        # Bucle principal
        while True:
            try:
                # Obtener datos del usuario
                vendor, product, version = obtener_datos_usuario()
                
                # Ejecutar análisis
                print(f"\n🔄 ANALIZANDO {vendor.upper()} {product.upper()} {version}...")
                print("⏳ Esto puede tomar unos segundos...")
                
                inicio = time.time()
                resultado = agente.analyze_device_vulnerabilities(vendor, product, version)
                duracion = time.time() - inicio
                
                # Mostrar resultados
                mostrar_resultados(resultado)
                print(f"\n⏱️  Tiempo de análisis: {duracion:.2f} segundos")
                
                # Preguntar por siguiente análisis
                print("\n" + "="*70)
                continuar = input("¿Realizar otro análisis? (s/n): ").strip().lower()
                if continuar not in ['s', 'si', 'sí', 'y', 'yes']:
                    print("\n👋 ¡Hasta luego! Que tengas un día seguro 🔒")
                    break
                    
                print("\n" + "="*70)
                
            except KeyboardInterrupt:
                print("\n\n👋 Ejecución interrumpida por el usuario")
                break
            except Exception as e:
                print(f"\n❌ Error durante el análisis: {e}")
                continuar = input("¿Intentar de nuevo? (s/n): ").strip().lower()
                if continuar not in ['s', 'si', 'sí']:
                    break
    
    except Exception as e:
        print(f"\n💥 ERROR CRÍTICO: {e}")
        print("💡 Verifica tu configuración y conexión a internet")


if __name__ == "__main__":
    main()