import { jsPDF } from "jspdf";
import cv from "./data/cv";

function loadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      try {
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

function stripHtml(html: string): string {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

/** Generates and downloads the CV PDF (same layout as curriculum-vitae). */
export async function generateCvPdf(): Promise<void> {
  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const pageBottomMargin = 5;
  const leftColumnWidth = 70;
  const rightColumnStart = leftColumnWidth + 10;
  const rightColumnWidth = pageWidth - rightColumnStart - margin;

  let yPos = margin;
  const sectionSpacing = 8;

  const drawLeftColumnBackground = () => {
    pdf.setFillColor(44, 62, 80);
    pdf.rect(0, 0, leftColumnWidth, pageHeight, "F");
  };

  const checkPageBreak = (requiredHeight: number) => {
    if (yPos + requiredHeight > pageHeight - pageBottomMargin) {
      pdf.addPage();
      drawLeftColumnBackground();
      yPos = margin;
      return true;
    }
    return false;
  };

  const addText = (
    text: string | undefined,
    x: number,
    y: number,
    maxWidth: number,
    fontSize = 10,
    fontStyle: "normal" | "bold" = "normal",
    color: [number, number, number] = [0, 0, 0],
  ) => {
    if (!text) return 0;
    pdf.setFontSize(fontSize);
    pdf.setFont("helvetica", fontStyle);
    pdf.setTextColor(color[0], color[1], color[2]);
    const lines = pdf.splitTextToSize(String(text), maxWidth);
    pdf.text(lines, x, y);
    return lines.length * (fontSize * 0.4);
  };

  drawLeftColumnBackground();

  let leftY = margin;

  try {
    const imageBase64 = await loadImageAsBase64("/images/me.png");
    const imageSize = 40;
    const imageX = (leftColumnWidth - imageSize) / 2;
    pdf.addImage(imageBase64, "PNG", imageX, leftY, imageSize, imageSize);
    leftY += imageSize + 8;
  } catch (error) {
    console.warn("Could not load profile image:", error);
  }

  const nameHeight = addText(
    cv.name,
    margin,
    leftY,
    leftColumnWidth - 2 * margin,
    16,
    "bold",
    [236, 240, 241],
  );
  leftY += nameHeight + 3;

  const titleHeight = addText(
    cv.title,
    margin,
    leftY,
    leftColumnWidth - 2 * margin,
    10,
    "normal",
    [189, 195, 199],
  );
  leftY += titleHeight + sectionSpacing;

  leftY += 5;
  addText(
    "CONTACT",
    margin,
    leftY,
    leftColumnWidth - 2 * margin,
    10,
    "bold",
    [52, 152, 219],
  );
  leftY += 6;

  const contactInfo = [
    { label: "Email:", text: "parameter64@proton.me" },
    { label: "Phone:", text: "+46 73 87 909 24" },
    { label: "Location:", text: "Uppsala, Sweden" },
    { label: "LinkedIn:", text: "pär-henriksson-80b99b1b" },
  ];

  contactInfo.forEach((contact) => {
    const contactHeight = addText(
      `${contact.label} ${contact.text}`,
      margin,
      leftY,
      leftColumnWidth - 2 * margin,
      9,
      "normal",
      [236, 240, 241],
    );
    leftY += contactHeight + 3;
  });

  leftY += sectionSpacing;

  addText(
    "SKILLS",
    margin,
    leftY,
    leftColumnWidth - 2 * margin,
    10,
    "bold",
    [52, 152, 219],
  );
  leftY += 6;

  Object.entries(cv.skills).forEach(([category, skills]) => {
    const categoryName = category.replace("_", " ").toUpperCase();
    const catHeight = addText(
      categoryName,
      margin,
      leftY,
      leftColumnWidth - 2 * margin,
      9,
      "bold",
      [236, 240, 241],
    );
    leftY += catHeight + 3;

    const skillsHeight = addText(
      skills.join(", "),
      margin,
      leftY,
      leftColumnWidth - 2 * margin,
      8,
      "normal",
      [189, 195, 199],
    );
    leftY += skillsHeight + 4;
  });

  yPos = margin;

  addText("ABOUT", rightColumnStart, yPos, rightColumnWidth, 12, "bold", [
    44, 62, 80,
  ]);
  yPos += 8;

  const aboutHeight = addText(
    cv.summary,
    rightColumnStart,
    yPos,
    rightColumnWidth,
    10,
    "normal",
    [85, 85, 85],
  );
  yPos += aboutHeight + sectionSpacing;

  addText(
    "EXPERIENCE",
    rightColumnStart,
    yPos,
    rightColumnWidth,
    12,
    "bold",
    [44, 62, 80],
  );
  yPos += 8;

  cv.experience.forEach((exp) => {
    exp.roles.forEach((role) => {
      if (role.pdfControl === "page-break-before" && yPos > margin + 20) {
        checkPageBreak(50);
        yPos += 5;
      }

      const estimatedHeight =
        20 +
        role.achievements.length * 7 +
        (role.tech && role.tech.length > 0 ? 8 : 0);
      if (yPos + estimatedHeight > pageHeight - pageBottomMargin) {
        pdf.addPage();
        drawLeftColumnBackground();
        yPos = margin;
      }

      const titleHeightRole = addText(
        role.title || "",
        rightColumnStart,
        yPos,
        rightColumnWidth,
        11,
        "bold",
        [44, 62, 80],
      );
      yPos += titleHeightRole + 2;

      if (role.company) {
        const companyHeight = addText(
          role.company,
          rightColumnStart,
          yPos,
          rightColumnWidth,
          10,
          "normal",
          [127, 140, 141],
        );
        yPos += companyHeight + 2;
      }

      if (role.startDate) {
        const dateText = `${role.startDate} – ${role.endDate || "Present"}`;
        const dateHeight = addText(
          dateText,
          rightColumnStart,
          yPos,
          rightColumnWidth,
          9,
          "normal",
          [127, 140, 141],
        );
        yPos += dateHeight + 4;
      }

      role.achievements.forEach((achievement) => {
        const cleanAchievement = stripHtml(achievement);
        const achievementHeight = addText(
          `• ${cleanAchievement}`,
          rightColumnStart + 3,
          yPos,
          rightColumnWidth - 3,
          9,
          "normal",
          [85, 85, 85],
        );
        yPos += achievementHeight + 2;

        if (yPos > pageHeight - pageBottomMargin - 5) {
          pdf.addPage();
          drawLeftColumnBackground();
          yPos = margin;
        }
      });

      if (role.tech && role.tech.length > 0) {
        yPos += 3;
        const techHeight = addText(
          role.tech.join(" • "),
          rightColumnStart,
          yPos,
          rightColumnWidth,
          8,
          "normal",
          [85, 85, 85],
        );
        yPos += techHeight + 6;
      } else {
        yPos += 4;
      }
    });
  });

  pdf.save("cv-par-henriksson.pdf");
}
