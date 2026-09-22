export type PDFParseConfidence = "good" | "partial" | "poor";

export type PDFTextItem = {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasEOL?: boolean;
};

type TextLine = {
  baselineY: number;
  height: number;
  items: PDFTextItem[];
};

const COMMON_HEADINGS = [
  "experience",
  "education",
  "skills",
  "projects",
  "summary",
  "work",
  "profile",
  "certifications",
];
export function mapPDFItemToTextItem(item: unknown): PDFTextItem | null {
  if (!item || typeof item !== "object" || !("str" in item)) {
    return null;
  }
  const raw = item as {
    str?: unknown;
    transform?: unknown;
    width?: unknown;
    height?: unknown;
    hasEOL?: unknown;
  };

  if (typeof raw.str !== "string") return null;

  const transform = Array.isArray(raw.transform) ? raw.transform : [];
  const x = typeof transform[4] === "number" ? transform[4] : 0;
  const y = typeof transform[5] === "number" ? transform[5] : 0;
  const width = typeof raw.width === "number" ? raw.width : 0;
  const height =
    typeof raw.height === "number" && raw.height > 0
      ? raw.height
      : typeof transform[3] === "number"
        ? Math.abs(transform[3])
        : 10;

  return {
    str: raw.str,
    x,
    y,
    width,
    height,
    hasEOL: Boolean(raw.hasEOL),
  };
}

export function reconstructPDFPageText(items: PDFTextItem[], pageWidth: number): string {
  const nonEmpty = items.filter((item) => item.str.length > 0 && item.str.trim().length > 0);
  if (nonEmpty.length === 0) return "";

  if (isTwoColumnLayout(nonEmpty, pageWidth)) {
    const midpoint = pageWidth / 2;
    const leftItems = nonEmpty.filter((item) => item.x + item.width / 2 <= midpoint);
    const rightItems = nonEmpty.filter((item) => item.x + item.width / 2 > midpoint);

    const leftLines = groupItemsIntoLines(leftItems).map(renderLine).filter(Boolean);
    const rightLines = groupItemsIntoLines(rightItems).map(renderLine).filter(Boolean);

    return [...leftLines, ...rightLines].join("\n").trim();
  }

  const lines = groupItemsIntoLines(nonEmpty).map(renderLine).filter(Boolean);
  return lines.join("\n").trim();
}

function isTwoColumnLayout(items: PDFTextItem[], pageWidth: number): boolean {
  const midpoint = pageWidth / 2;
  const minColumnGap = pageWidth * 0.12;

  // Check for dominant full-width lines
  const hasDominantFullWidth = items.some(
    (item) =>
      item.width >= pageWidth * 0.65 ||
      (item.x < midpoint - pageWidth * 0.15 && item.x + item.width > midpoint + pageWidth * 0.15),
  );
  if (hasDominantFullWidth) return false;

  const leftItems = items.filter((item) => item.x + item.width <= midpoint + pageWidth * 0.05);
  const rightItems = items.filter((item) => item.x >= midpoint - pageWidth * 0.05);

  if (leftItems.length < 3 || rightItems.length < 3) return false;

  // Compute horizontal gaps between overlapping left and right items
  const gaps: number[] = [];
  for (const left of leftItems) {
    for (const right of rightItems) {
      const yDist = Math.abs(left.y - right.y);
      const maxHeight = Math.max(left.height, right.height, 10);
      if (yDist <= maxHeight * 1.2) {
        const gap = right.x - (left.x + left.width);
        if (gap > 0) {
          gaps.push(gap);
        }
      }
    }
  }

  if (gaps.length === 0) {
    // Fallback check between rightmost left-item and leftmost right-item
    const maxLeftX = Math.max(...leftItems.map((i) => i.x + i.width));
    const minRightX = Math.min(...rightItems.map((i) => i.x));
    return minRightX - maxLeftX >= minColumnGap;
  }

  gaps.sort((a, b) => a - b);
  const medianGap = gaps[Math.floor(gaps.length / 2)];
  return medianGap >= minColumnGap;
}

function groupItemsIntoLines(items: PDFTextItem[]): TextLine[] {
  // Sort descending by Y (in PDF coords, higher Y is higher on the page)
  const sorted = [...items].sort((a, b) => {
    if (Math.abs(b.y - a.y) > 0.5) return b.y - a.y;
    return a.x - b.x;
  });

  const lines: TextLine[] = [];

  for (const item of sorted) {
    let matchedLine: TextLine | undefined;

    for (const line of lines) {
      const tolerance = 0.45 * Math.max(item.height, line.height, 8);
      if (Math.abs(item.y - line.baselineY) <= tolerance) {
        matchedLine = line;
        break;
      }
    }

    if (matchedLine) {
      matchedLine.items.push(item);
      matchedLine.height = Math.max(matchedLine.height, item.height);
    } else {
      lines.push({
        baselineY: item.y,
        height: item.height || 10,
        items: [item],
      });
    }
  }

  // Sort each line's items by x coordinate ascending
  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
  }

  return lines;
}

function renderLine(line: TextLine): string {
  let result = "";

  for (let i = 0; i < line.items.length; i++) {
    const item = line.items[i];
    const prev = i > 0 ? line.items[i - 1] : null;

    if (prev) {
      const gap = item.x - (prev.x + prev.width);
      const needsSpace =
        !result.endsWith(" ") &&
        !item.str.startsWith(" ") &&
        (gap > 1.5 || prev.hasEOL === false);
      if (needsSpace) {
        result += " ";
      }
    }

    result += item.str;
  }

  return result.trim();
}

export function analyzePDFTextQuality(
  text: string,
  pageCount: number,
): { confidence: PDFParseConfidence; warnings: string[] } {
  const characterCount = text.length;
  const averageCharsPerPage = pageCount > 0 ? characterCount / pageCount : 0;
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const nonEmptyLineCount = lines.length;

  let repeatedRatio = 0;
  if (lines.length >= 6) {
    const uniqueLineMap: Record<string, true> = {};
    for (const line of lines) {
      uniqueLineMap[line.toLowerCase()] = true;
    }
    const uniqueCount = Object.keys(uniqueLineMap).length;
    repeatedRatio = 1 - uniqueCount / lines.length;
  }

  const lower = text.toLowerCase();
  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text);
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(text);
  let headingCount = 0;
  for (const heading of COMMON_HEADINGS) {
    if (lower.includes(heading)) headingCount++;
  }
  const hasHeadings = headingCount >= 2;
  const hasSubstantialLines = nonEmptyLineCount >= 6;

  let structuralSignals = 0;
  if (hasEmail) structuralSignals++;
  if (hasPhone) structuralSignals++;
  if (hasHeadings) structuralSignals++;
  if (hasSubstantialLines) structuralSignals++;

  if (characterCount < 50 || averageCharsPerPage < 25 || repeatedRatio > 0.5 || nonEmptyLineCount < 3) {
    const warnings =
      repeatedRatio > 0.5
        ? [
            "PDF extraction detected repetitive or corrupted text.",
            "Paste CV text manually for a better review.",
          ]
        : [
            "PDF text extraction found very little readable text.",
            `Average readable text is ${Math.round(averageCharsPerPage).toLocaleString()} characters per page. This PDF may be image-based or ATS-unfriendly.`,
            "Paste CV text manually for a better review.",
          ];

    return { confidence: "poor", warnings };
  }

  if (characterCount >= 400 && averageCharsPerPage >= 80 && structuralSignals >= 2) {
    return {
      confidence: "good",
      warnings: ["PDF text extraction looks usable. Review extracted text before submitting."],
    };
  }

  return {
    confidence: "partial",
    warnings: [
      `Extracted text has ${characterCount.toLocaleString()} characters, but some CV sections or contact details may be missing.`,
      "Review extracted text and paste missing content manually before submitting.",
    ],
  };
}
