import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import type { CVE, VulnerabilityAnalysis } from "@/lib/types";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session.token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const { vendor, product, version, scan, cves, analysis, generatedAt, locale, timeZone }: {
    vendor: string;
    product: string;
    version: string;
    scan?: { id: string; type: string; status: string; startedAt: string; totalDevices?: number } | null;
    cves: CVE[] | string[];
    analysis?: VulnerabilityAnalysis | null;
    generatedAt?: string | null;
    locale?: string | null;
    timeZone?: string | null;
  } = payload as {
    vendor: string;
    product: string;
    version: string;
    scan?: { id: string; type: string; status: string; startedAt: string; totalDevices?: number } | null;
    cves: CVE[] | string[];
    analysis?: VulnerabilityAnalysis | null;
    generatedAt?: string | null;
    locale?: string | null;
    timeZone?: string | null;
  };

  const cveList: string[] = Array.isArray(cves)
    ? (cves as (CVE | string)[])
        .map((c) => (typeof c === "string" ? c : c.cveId))
        .filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();
  const margin = 50;
  const contentWidth = width - margin * 2;

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - margin;
  const pages: typeof page[] = [page];
  const primary = rgb(14 / 255, 165 / 255, 233 / 255); // #0ea5e9
  const textColor = rgb(17 / 255, 24 / 255, 39 / 255); // #111827
  const muted = rgb(107 / 255, 114 / 255, 128 / 255); // #6b7280
  const border = rgb(229 / 255, 231 / 255, 235 / 255); // #e5e7eb
  // const lightRow = rgb(249 / 255, 250 / 255, 251 / 255); // #f9fafb

  // old helpers removed; using page-aware helpers below

  // Better: track current page object variable
  let currentPage = page;
  const setPage = (p: typeof page) => { currentPage = p; };
  const drawTextP = (text: string, size = 11, color = textColor, bold = false, x = margin) => {
    const font = bold ? fontBold : fontRegular;
    currentPage.drawText(text, { x, y: y - size, size, font, color });
    y -= size + 4;
  };
  const lineP = (color = primary, length = contentWidth) => {
    currentPage.drawLine({ start: { x: margin, y }, end: { x: margin + length, y }, thickness: 1, color });
    y -= 12;
  };
  const newPage = () => {
    const p = pdfDoc.addPage([595.28, 841.89]);
    setPage(p);
    y = height - margin;
    pages.push(p);
  };
  const ensureSpaceP = (needed = 60) => {
    if (y - needed < margin) newPage();
  };

  const wrapText = (text: string, size = 11, maxWidth = contentWidth, font = fontRegular) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      const width = font.widthOfTextAtSize(test, size);
      if (width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  };


  const section = (title: string) => {
    ensureSpaceP(40);
    drawTextP(title.toUpperCase(), 12, primary, true);
    lineP(primary, 150);
  };

  // Modern cover/title section
  const coverHeight = 80;
  currentPage.drawRectangle({ x: 0, y: height - coverHeight, width, height: coverHeight, color: primary });
  const headerTitle = "VulnTrack Security Report";
  const headerTitleSize = 28;
  const titleWidth = fontBold.widthOfTextAtSize(headerTitle, headerTitleSize);
  currentPage.drawText(headerTitle, { x: margin + (contentWidth - titleWidth) / 2, y: height - coverHeight + 30, size: headerTitleSize, font: fontBold, color: rgb(1,1,1) });
  const ts = generatedAt || new Date().toLocaleString(locale || undefined, timeZone ? { timeZone } : undefined);
  const tsSize = 12;
  const tsWidth = fontRegular.widthOfTextAtSize(ts, tsSize);
  currentPage.drawText(ts, { x: margin + (contentWidth - tsWidth) / 2, y: height - coverHeight + 10, size: tsSize, font: fontRegular, color: rgb(1,1,1) });
  y = height - coverHeight - 20;
  // Accent divider
  currentPage.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 2, color: primary });
  y -= 20;

  // Device & Scan Info grouped card
  section("Device & Scan Information");
  const leftInfo = [
    `Vendor: ${vendor || ""}`,
    `Product: ${product || ""}`,
    `Version: ${version || ""}`
  ];
  const rightInfo = [
    scan ? `Scan ID: ${scan.id}` : "",
    scan ? `Type: ${scan.type}` : "",
    scan ? `Status: ${scan.status}` : "",
    scan ? `Started: ${scan.startedAt}` : "",
    scan && typeof scan.totalDevices !== "undefined" ? `Devices Scanned: ${scan.totalDevices}` : ""
  ].filter(Boolean);
  const infoLineHeight = 16;
  const infoSectionPadding = 24;
  const infoSectionHeight = Math.max(leftInfo.length, rightInfo.length) * infoLineHeight + infoSectionPadding;
  ensureSpaceP(infoSectionHeight + 24);
  currentPage.drawRectangle({ x: margin, y: y - infoSectionHeight, width: contentWidth, height: infoSectionHeight, color: rgb(243/255,244/255,246/255) });
  let infoY = y - 18;
  for (let i = 0; i < Math.max(leftInfo.length, rightInfo.length); i++) {
    if (leftInfo[i]) {
      currentPage.drawText(leftInfo[i], { x: margin + 16, y: infoY, size: 11, font: fontRegular, color: textColor });
    }
    if (rightInfo[i]) {
      currentPage.drawText(rightInfo[i], { x: margin + 220, y: infoY, size: 11, font: fontRegular, color: textColor });
    }
    infoY -= infoLineHeight;
  }
  y = y - infoSectionHeight - 24;

  // Vulnerabilities Table with shaded header
  section("Vulnerabilities Detected");
  if (cveList.length) {
    const rowHeight = 20;
    const col1X = margin + 8;
    const col2X = margin + 180;
    ensureSpaceP(rowHeight + 24);
    // Header background
    currentPage.drawRectangle({ x: margin, y: y - rowHeight + 8, width: contentWidth, height: rowHeight, color: rgb(236/255,245/255,255/255) });
    currentPage.drawText("CVE ID", { x: col1X, y: y - 13, size: 11, font: fontBold, color: primary });
    currentPage.drawText("NVD Details", { x: col2X, y: y - 13, size: 11, font: fontBold, color: primary });
    y -= rowHeight;
    currentPage.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 1, color: border });
    for (const id of cveList) {
      ensureSpaceP(rowHeight + 4);
      const url = `https://nvd.nist.gov/vuln/detail/${id}`;
      currentPage.drawText(id, { x: col1X, y: y - 13, size: 11, font: fontRegular, color: textColor });
      currentPage.drawText(url, { x: col2X, y: y - 13, size: 11, font: fontRegular, color: primary });
      y -= rowHeight;
      currentPage.drawLine({ start: { x: margin, y }, end: { x: margin + contentWidth, y }, thickness: 0.5, color: border });
    }
    y -= 24;
  } else {
    ensureSpaceP(24);
    drawTextP("None");
    y -= 24;
  }

  // Recommendations (modern card)
  section("Recommendations");
  let recBlocks: Array<{ text: string, bold?: boolean, indent?: number, justify?: boolean }> = [];
  if (analysis) {
    if (analysis.riskLevel) recBlocks.push({ text: "Risk Level:", bold: true });
    if (analysis.riskLevel) recBlocks = recBlocks.concat(wrapText(analysis.riskLevel, 11, contentWidth - 32, fontRegular).map(t => ({ text: t, justify: true })));
    if (analysis.summary) {
      recBlocks = recBlocks.concat(wrapText(analysis.summary, 11, contentWidth - 32, fontRegular).map(t => ({ text: t, justify: true })));
    }
    if (Array.isArray(analysis.recommendations) && analysis.recommendations.length) {
      recBlocks.push({ text: "Recommendations:", bold: true });
      for (const r of analysis.recommendations) {
        recBlocks = recBlocks.concat(wrapText(r, 11, contentWidth - 64, fontRegular).map((t, i) => ({ text: (i === 0 ? `- ${t}` : t), indent: 32, justify: true })));
      }
    }
    if (Array.isArray(analysis.priorityActions) && analysis.priorityActions.length) {
      recBlocks.push({ text: "Priority Actions:", bold: true });
      analysis.priorityActions.forEach((p, i) => {
        recBlocks = recBlocks.concat(wrapText(p, 11, contentWidth - 64, fontRegular).map((t, j) => ({ text: (j === 0 ? `${i + 1}. ${t}` : t), indent: 32, justify: true })));
      });
    }
  }
  const recLineHeight = 16;
  const recSectionPadding = 24;
  const recSectionHeight = recBlocks.length * recLineHeight + recSectionPadding;
  ensureSpaceP(recSectionHeight + 24);
  currentPage.drawRectangle({ x: margin, y: y - recSectionHeight, width: contentWidth, height: recSectionHeight, color: rgb(243/255,244/255,246/255) });
  let recY = y - 18;
  for (const block of recBlocks) {
    ensureSpaceP(recLineHeight + 4);
    const font = block.bold ? fontBold : fontRegular;
    const xPos = margin + 16 + (block.indent || 0);
    if (block.justify) {
      const words = block.text.split(/\s+/);
      const gaps = Math.max(words.length - 1, 1);
      const textWidth = words.reduce((acc, w, i) => acc + font.widthOfTextAtSize(w, 11) + (i > 0 ? font.widthOfTextAtSize(" ", 11) : 0), 0);
      const extra = Math.max(contentWidth - 32 - (block.indent || 0) - textWidth, 0);
      const extraPerGap = extra / gaps;
      let xWord = xPos;
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        currentPage.drawText(w, { x: xWord, y: recY, size: 11, font, color: textColor });
        xWord += font.widthOfTextAtSize(w, 11);
        if (i < words.length - 1) {
          xWord += font.widthOfTextAtSize(" ", 11) + extraPerGap;
        }
      }
    } else {
      currentPage.drawText(block.text, { x: xPos, y: recY, size: 11, font, color: textColor });
    }
    recY -= recLineHeight;
    y -= recLineHeight;
  }
  y = y - recSectionPadding;

  // Footer: page number and confidentiality (en todas las páginas)
  const footerFontSize = 10;
  const footerY = margin - 20;
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const footerText = `Confidential – For authorized use only | Page ${i + 1}`;
    const footerWidth = fontRegular.widthOfTextAtSize(footerText, footerFontSize);
    p.drawText(footerText, { x: margin + (contentWidth - footerWidth) / 2, y: footerY, size: footerFontSize, font: fontRegular, color: muted });
  }

  const pdfBytes = await pdfDoc.save();
  const arrayBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
  return new NextResponse(arrayBuffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="vulntrack-report.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
