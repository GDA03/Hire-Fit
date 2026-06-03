# Deep Research — Dealls AI CV Reviewer

Source utama: https://dealls.com/cv-reviewer

Tujuan: tiru full feature untuk project HireFit tanpa copy branding, UI asset, atau teks persis.

---

## 1. Ringkasan Produk

Dealls AI CV Reviewer adalah tool review CV/resume berbasis AI + ATS checker. Value utama:

- Upload CV, dapat evaluasi dalam ±1 menit.
- Klaim peningkatan peluang lolos screening ATS sebesar 73%.
- Rating sosial: 4.9/5 dari 1.035 pengguna.
- Analisis 12 aspek CV.
- Output berupa skor total + skor per bagian + analisis + action points + alasan penting.
- Bisa dipakai guest, tapi riwayat hasil butuh sign in.
- Ada monetisasi lewat unlock/payment: harga promo Rp29rb dari Rp100rb, 71% off.

Positioning: “Review CV atau resume dengan AI CV ATS Checker dan tingkatkan peluang diterima kerja hanya dalam 1 menit.”

---

## 2. Flow Pengguna

### Landing / Hero

Elemen:

- Navigation: Loker, Mentoring, Perusahaan, Events, AI CV Analyzer.
- Auth CTA: Masuk, Daftar.
- Primary CTA: “Review CV Sekarang”.
- Hero claim: “Tingkatkan Peluang Lolos Screening CV ATS Sebesar 73% 🚀”.
- Social proof: “⭐️ 4.9/5 • Review dari 1.035 Pengguna”.
- Form embedded di hero.

### Form Review CV

Field terlihat:

1. CV / Resume
   - Required.
   - Upload File.
   - Max. 5MB.
2. Select Language
   - Required.
   - Options: English, Bahasa Indonesia.
3. Review Purpose
   - Required.
   - Options: Job Seeking, Job-seeking & Scholarship.
4. CTA: Review Sekarang.

Dari JS bundle, schema submit:

```ts
{
  cvUrl: string; // URL valid
  language: string;
  jobRole?: string;
  jobDescription?: string;
}
```

Ada field tambahan tersimpan di local/session:

```ts
{
  purpose: string;
  language: string;
  payload: {
    jobDescription?: string;
    jobRole?: string;
    scholarshipTitle?: string | null;
  }
}
```

Guest flow:

1. User pilih file.
2. File upload dulu ke public upload endpoint.
3. Response upload berisi `data.url`.
4. URL CV dikirim ke AI CV Review endpoint.
5. User diarahkan ke `/cv-reviewer/results/{id}`.

Authenticated flow:

1. Form sudah punya `cvUrl`.
2. Submit langsung ke AI CV Review endpoint.
3. Result ID dipakai redirect.

### Results Page

Route list:

- `/cv-reviewer/results`
- `/cv-reviewer/results/{id}`

Jika belum login di results list:

- “Sign in untuk melihat riwayat CV review kamu”.
- Message: “79.3% lamaran ditolak di tahap CV screening. Review CV & tingkatkan peluang lolosmu!”
- CTA: Sign Up, Sign In.

---

## 3. Backend/API Terlihat dari Bundle

Endpoints ditemukan di JS chunk:

```ts
GET    /v1/job-portal/ai-cv-review/:id
POST   /v1/job-portal/ai-cv-review
GET    /v1/job-portal/ai-cv-review
GET    /v1/job-portal/ai-cv-review/completed-count
POST   /v1/job-portal/ai-cv-review/:id/pay
GET    /v1/job-portal/ai-cv-review/:id/review-status
PATCH  /v1/job-portal/ai-cv-review/:id/retry
GET    /v1/job-portal/ai-cv-review/discount
GET    /v1/job-portal/ai-cv-review/config
```

Upload public:

```ts
POST /public-upload-or-equivalent
Content-Type: multipart/form-data
FormData:
  file: File
  docType: "JobPortalCV"
  saveFilename: "true" | "false"
```

Nama method frontend: `postUploadPublic`.

Submit review:

```ts
POST /v1/job-portal/ai-cv-review
Body:
{
  cvUrl: string;
  language: string;
  jobRole?: string;
  jobDescription?: string;
}
```

Status polling likely dipakai untuk analisis async:

```ts
GET /v1/job-portal/ai-cv-review/:id/review-status
```

Retry gagal:

```ts
PATCH /v1/job-portal/ai-cv-review/:id/retry
```

Payment unlock:

```ts
POST /v1/job-portal/ai-cv-review/:id/pay
```

Discount/config:

```ts
GET /v1/job-portal/ai-cv-review/discount
GET /v1/job-portal/ai-cv-review/config
```

Error cases terlihat:

- `FAILED_TO_UPLOAD_CV` → tampil “Gagal mengunggah CV. Memuat ulang halaman...”
- `CANNOT_REVIEW_TWO_CV_IN_SAME_TIME` → “Analisis CV Sedang Berlangsung. Harap tunggu sebelum mengirim CV lainnya.”
- `REVIEW_LIMIT_EXCEEDED` → “Mohon maaf! Saat ini antrian untuk review CV sedang sangat tinggi. Mohon coba lagi dalam {duration}.”

---

## 4. Output Analisis — 12 Aspek

Dealls menampilkan “Bedah 12 Aspek CV Kamu dengan AI”. Aspek:

1. Overall Impression
2. Contact Information
3. Relevant Skill
4. Professional Summary
5. Work Experience
6. Achievement
7. Education and Certification
8. Organizational Activity
9. Consistent & Error-free Writing
10. Additional Section
11. Keywords
12. Career Recommendation

Dari JS bundle, result juga punya conditional sections:

- `jobFit`
- `tailoredContent`
- `experienceMatch`

Bagian ini muncul jika user isi `jobRole` atau `jobDescription`. Jika CV locked dan tidak ada role/description, beberapa section disembunyikan.

---

## 5. Struktur Result UI

Setiap section memakai accordion/collapse.

Header section:

- Title.
- Score badge jika punya score.
- Jika locked dan score null: tombol “Unlock Now”.
- Score format: `SCORE 62%`.
- Warna score berubah berdasarkan nilai.

Overall score:

- Circular progress chart.
- Angka persen di tengah.
- Contoh total: 67%.

Section content pattern:

1. Analysis
2. Action points
3. Why It’s Important For You

Tidak semua section sama. Keywords memakai format daftar kategori. Career Recommendation berupa paragraf rekomendasi karier.

---

## 6. Contoh Data Dummy / Demo Result

### Overall Impression

Score: 67%

Isi contoh:

- CV sudah cukup baik, tapi bisa lebih kuat.
- Tambahkan professional summary.
- Perluas skills section.
- Highlight achievements dengan measurable results.
- Portfolio link bagus.
- Tambahkan Volunteer Work, Languages, Interests.

### Contact Information

Score: 62%

Analysis:

- Nama, phone, email ada.
- LinkedIn profile belum ada.

Action points:

- Tambahkan LinkedIn URL.
- Gunakan email lebih profesional dan memorable.

Why important:

- Recruiter cek kontak dulu.
- Kontak lengkap = organized dan serius.

### Relevant Skills

Score: 71%

Analysis:

- Skill relevan terdeteksi seperti Advertorial, Article Writing, Social Media Admin.
- Perlu contoh spesifik.

Action points:

- Perluas skill dengan contoh konkret.
- Pakai keyword dari job description.
- Tambahkan technical skills/tools seperti WordPress atau Canva.

### Professional Summary

Score: 42%

Analysis:

- Professional summary/objective belum ada.

Action points:

- Tambahkan summary 3–4 kalimat di awal CV.
- Customize per job/company/role.

### Work Experience

Score: 89%

Analysis:

- Job title, company, dates, responsibilities sudah ada.
- Butuh detail dan quantified results.

Action points:

- Ubah responsibility generik jadi impact: “Wrote 10+ articles per week..., increasing website traffic by 10%.”
- Highlight achievement relevan dengan role.

### Achievements

Score: 32%

Analysis:

- Achievement spesifik dan quantifiable kurang.

Action points:

- Quantify achievement.
- Pakai action verbs.

### Education & Certification

Score: 71%

Analysis:

- Degree, institution, graduation dates ada.
- Butuh coursework/projects relevan.

Action points:

- Tambah coursework/projects.
- Tambah academic awards/honors.
- Tambah certification relevan.

### Organizational Activities

Score: 22%

Analysis:

- Organizational activities dan leadership roles belum ada.

Action points:

- Tambahkan volunteer work, student clubs, community initiatives.
- Highlight leadership.
- Quantify achievement organisasi.
- Customize berdasarkan job requirements.

### Consistent & Error-free Writing

Score: 78%

Analysis:

- CV cukup baik, tapi ada grammar/punctuation minor.
- Bullet points belum konsisten.

Action points:

- Proofread.
- Pakai format konsisten: font, size, spacing.
- Konsistenkan bullet points.

### Additional Section

Score: 41%

Analysis:

- Portfolio link bagus.
- Perlu tambahan Volunteer Work, Languages, Interests.

Action points:

- Tambah Volunteer Work.
- Tambah Languages.
- Tambah Interests relevan.

### Keywords

Format:

- Job Titles: Content Writer, Copywriter
- Skills: Creativity, Innovation, Teamwork, Problem-solving, Reliability, Organization, Leadership, Strategy, Empathy, Support, Collaboration, Adaptability, Resourcefulness, Flexibility, Analytical, Detail-oriented
- Career Paths: Content Creator
- Professional Summaries: Vibrant, Creative, Collaborative, Analytical, Organized, Reliable, Strategic
- Additional Keywords: Outgoing - Generalist

### Career Recommendation

Contoh output:

- User punya background content writing/copywriting.
- Cocok untuk role creative writer.
- Cocok dengan lifestyle, travel, finance, education content.
- Punya pemahaman SEO.

---

## 7. Monetisasi / Locking

Pricing banner:

- Flash Sale.
- 71% OFF.
- Rp100rb dicoret.
- Rp29rb harga promo.

Behavior:

- Section tertentu bisa locked.
- Jika locked dan section belum punya score/result, header tampil “Unlock Now”.
- Klik unlock tracking event `clickUnlockCVReview`.
- Payment endpoint: `POST /v1/job-portal/ai-cv-review/:id/pay`.
- Payment URL dipakai untuk CTA unlock.

Model monetisasi cocok ditiru:

- Free partial review.
- Paid full detail/unlock.
- Optional promo discount.
- Config endpoint mengontrol limit, pricing, lock rules.

---

## 8. Social Proof / Testimonial

Testimonial dipakai untuk legitimasi. Persona:

- Career community/media.
- Undergraduate student.
- Freshgraduate.
- Social media specialist.
- Career content creator.
- Legal consultant.
- HR business partner.

Pesan testimonial utama:

- Banyak kekurangan CV baru diketahui setelah review.
- Bantu ubah CV non-ATS jadi ATS.
- Bantu ubah bahasa non-formal jadi profesional.
- Hasil detail dalam <1 menit.
- Bantu keyword yang harus di-highlight.
- Bantu paid internship/freshgrad/jobseeker.

Untuk HireFit, buat testimonial sendiri, jangan copy nama/handle/teks.

---

## 9. FAQ / Education Content

FAQ visible:

### Apa itu CV ATS Checker?

ATS adalah software untuk menyaring lamaran otomatis berdasarkan kriteria tertentu. AI CV Reviewer/ATS Checker menilai CV terhadap standar ATS dan requirements pekerjaan.

### Bagaimana cara optimasi CV agar ATS friendly?

Upload CV, AI memberi skor dan hasil analisis. User perbaiki bagian yang skornya rendah.

### Bagaimana mengetahui CV sudah sesuai pekerjaan?

Upload CV, lihat total skor. Cek bagian Relevant Skill dan Work Experience. Perbaiki berdasarkan analisis.

### Format CV bagus untuk ATS?

Gunakan .doc atau PDF. Tujuan: kompatibel dengan ATS dan minim risiko informasi tidak terbaca.

### Berapa skor ATS bagus?

Minimal 70% overall dan tiap section minimal 70%. Namun tetap harus readable untuk manusia/recruiter.

---

## 10. Feature Set untuk HireFit

### MVP wajib

1. Upload CV
   - PDF dan DOC/DOCX.
   - Max 5MB atau configurable.
   - Drag/drop + file picker.
   - Validation: file type, size, parsing success.

2. Language selection
   - English.
   - Bahasa Indonesia.

3. Review purpose
   - Job seeking.
   - Job seeking + scholarship.
   - Optional: Career switch, Internship, Fresh graduate.

4. Optional job targeting
   - Target job title.
   - Job description paste.
   - Scholarship title/description jika purpose scholarship.

5. Async AI analysis
   - Submit creates review ID.
   - Poll status.
   - Retry failed analysis.
   - Queue/rate limit guard.

6. Result summary
   - Overall ATS score.
   - Score color tiers.
   - Short overall impression.

7. 12 section analysis
   - Contact Information.
   - Skills.
   - Professional Summary.
   - Work Experience.
   - Achievements.
   - Education/Certification.
   - Organization/Volunteer.
   - Writing/Grammar/Formatting.
   - Additional Sections.
   - Keywords.
   - Career Recommendation.
   - Job Fit / Tailored Content.

8. Per-section output
   - Score.
   - What works.
   - Problems found.
   - Action points.
   - Why important.
   - Example rewrite.

9. Results history
   - Requires login.
   - List past reviews.
   - View detail.
   - Re-run/retry.

10. Monetization
   - Free partial result.
   - Paid unlock all sections.
   - Discount/promo config.
   - Payment link creation.

### Nice-to-have

1. CV parser preview
   - Show extracted name, email, phone, sections.
   - Warn if parser cannot read CV.

2. ATS compatibility checks
   - Multi-column layout risk.
   - Image/icon/text-in-image risk.
   - Missing headings.
   - Weird fonts/symbols.
   - File name professionalism.

3. Keyword matching
   - Extract JD keywords.
   - Compare against CV keywords.
   - Missing keywords list.
   - Overused/weak keywords list.

4. Rewrite generator
   - Rewrite bullet points with action verb + metric.
   - Generate professional summary.
   - Generate skills section.
   - Generate achievement phrasing.

5. Export
   - Download report PDF.
   - Copy action plan.
   - Save version.

6. Progress plan
   - “Fix these 5 things first”.
   - Priority by impact.

7. Resume builder integration
   - Apply recommendations into CV template.

---

## 11. Suggested Data Model for HireFit

```ts
type CVReview = {
  id: string;
  userId?: string;
  cvUrl: string;
  originalFileName: string;
  language: 'en' | 'id';
  purpose: 'job_seeking' | 'job_scholarship' | 'internship' | 'career_switch';
  jobRole?: string;
  jobDescription?: string;
  scholarshipTitle?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  locked: boolean;
  paymentUrl?: string;
  overallScore?: number;
  result?: CVReviewResult;
  createdAt: string;
  updatedAt: string;
};

type CVReviewResult = {
  overallImpression: SectionResult;
  contactInformation: SectionResult;
  relevantSkills: SectionResult;
  professionalSummary: SectionResult;
  workExperience: SectionResult;
  achievements: SectionResult;
  educationCertification: SectionResult;
  organizationalActivity: SectionResult;
  writingConsistency: SectionResult;
  additionalSection: SectionResult;
  keywords: KeywordResult;
  careerRecommendation: CareerRecommendationResult;
  jobFit?: SectionResult;
  tailoredContent?: SectionResult;
  experienceMatch?: SectionResult;
};

type SectionResult = {
  score: number | null;
  analysis: string;
  actionPoints: string[];
  whyImportant: string;
  examples?: string[];
  priority?: 'high' | 'medium' | 'low';
};

type KeywordResult = {
  jobTitles: string[];
  skills: string[];
  careerPaths: string[];
  professionalSummaryKeywords: string[];
  additionalKeywords: string[];
  missingKeywords?: string[];
};

type CareerRecommendationResult = {
  summary: string;
  recommendedRoles: string[];
  recommendedIndustries?: string[];
  nextSteps: string[];
};
```

---

## 12. Suggested API for HireFit

```http
POST /api/uploads/cv
Content-Type: multipart/form-data
Body: file, docType=CV, saveFilename=true
Response: { url, fileName, size, mimeType }
```

```http
POST /api/cv-reviews
Body: {
  cvUrl,
  language,
  purpose,
  jobRole?,
  jobDescription?,
  scholarshipTitle?
}
Response: { id, status }
```

```http
GET /api/cv-reviews/:id
Response: CVReview
```

```http
GET /api/cv-reviews/:id/status
Response: { id, status, progress?, message? }
```

```http
PATCH /api/cv-reviews/:id/retry
Response: { id, status }
```

```http
GET /api/cv-reviews
Query: page, limit, status
Response: { data, pagination }
```

```http
GET /api/cv-reviews/config
Response: { maxFileSizeMB, supportedFormats, freeSections, paidSections, pricing }
```

```http
GET /api/cv-reviews/discount
Response: { active, originalPrice, salePrice, percentOff, label }
```

```http
POST /api/cv-reviews/:id/pay
Response: { paymentUrl }
```

---

## 13. AI Prompt Architecture for HireFit

Pipeline recommended:

1. Extract CV text
   - PDF/DOC parser.
   - Detect parse confidence.
   - If text too low, ask upload ATS-friendly version.

2. Normalize sections
   - contact_info
   - summary
   - skills
   - work_experience
   - education
   - certifications
   - projects
   - organization
   - additional

3. Analyze ATS compatibility
   - structure.
   - keywords.
   - quantification.
   - clarity.
   - grammar.
   - job fit.

4. Score sections
   - 0–100.
   - 70+ good threshold.
   - Return reason for score.

5. Generate recommendations
   - action points specific to CV.
   - rewrite examples.
   - priority order.

6. Return strict JSON
   - Avoid freeform parse errors.

Scoring rubric:

- 90–100: excellent, minor optimization.
- 75–89: good, some improvements.
- 60–74: passable, needs targeted fixes.
- 40–59: weak, missing key content.
- 0–39: critical issue/missing section.

---

## 14. UI/UX Notes to Copy Conceptually

Do:

- Put form above fold.
- Show clear upload max size.
- Use short required fields.
- Show trust metric near CTA.
- Show demo result before user uploads.
- Use accordion for long analysis.
- Use colored section scores.
- Use circular total score.
- Use locked “Unlock Now” rows for paid sections.
- Add FAQ after testimonials.

Avoid:

- Copy exact Dealls copy, image assets, testimonial names/handles, layout pixel-perfect.
- Use “Dealls” brand elements.

---

## 15. Competitive Differentiation Ideas for HireFit

To beat Dealls clone:

1. More actionable rewrites
   - “Before → After” bullets.
   - One-click copy.

2. JD matching score
   - Match against real job description.
   - Missing keyword heatmap.

3. ATS parse preview
   - Show exactly what ATS reads.

4. Multi-version tracking
   - Compare Review v1 vs v2 score.

5. Role templates
   - Software Engineer, Product Manager, Data Analyst, Sales, HR, Finance.

6. Localized advice
   - Indonesia job market.
   - English/global job market.

7. Recruiter mode
   - “What recruiter will notice in 10 seconds”.

8. Privacy positioning
   - Auto-delete CV after X days.
   - User-controlled deletion.

---

## 16. Implementation Checklist

### Frontend

- [ ] Landing hero + upload form.
- [ ] File validation.
- [ ] Language selector.
- [ ] Purpose selector.
- [ ] Optional JD/job role fields.
- [ ] Submit loading state.
- [ ] Result polling page.
- [ ] Result accordion.
- [ ] Score components.
- [ ] Locked sections + unlock CTA.
- [ ] Result history page.
- [ ] FAQ/testimonial sections.

### Backend

- [ ] Upload endpoint.
- [ ] CV text extraction.
- [ ] Review create endpoint.
- [ ] Queue/worker for AI analysis.
- [ ] Status endpoint.
- [ ] Retry endpoint.
- [ ] Config endpoint.
- [ ] Discount endpoint.
- [ ] Payment endpoint.
- [ ] Rate limit: one processing review per user/guest.
- [ ] Guest review session support.

### AI

- [ ] Prompt for section extraction.
- [ ] Prompt for ATS scoring.
- [ ] Prompt for job matching.
- [ ] Prompt for rewrite/action points.
- [ ] JSON schema validation.
- [ ] Fallback if CV parse poor.

### Monetization

- [ ] Define free vs paid sections.
- [ ] Price config.
- [ ] Discount banner.
- [ ] Payment link.
- [ ] Unlock state after payment.

---

## 17. Copywriting Draft for HireFit

Hero alternatives:

- “Cek kualitas CV dan kesiapan ATS dalam 1 menit.”
- “Temukan bagian CV yang bikin lamaranmu kalah screening.”
- “Upload CV, dapat skor, prioritas perbaikan, dan contoh rewrite.”

CTA:

- “Review CV Sekarang”
- “Cek Skor ATS”
- “Analisis CV Gratis”

Trust metric placeholder:

- “Dipakai jobseeker, fresh graduate, dan career switcher.”
- “Analisis 12 aspek CV + rekomendasi perbaikan.”

---

## 18. Kesimpulan

Dealls CV Reviewer bukan cuma ATS score. Produk inti terdiri dari:

- Upload CV.
- AI analysis async.
- 12-section scoring.
- Actionable recommendations.
- Keyword/career recommendation.
- Result history behind auth.
- Paid unlock flow.
- Social proof + FAQ education.

Untuk HireFit, clone feature set paling penting:

1. Upload → analyze → result ID.
2. 12 aspek + score + action points.
3. JD-aware analysis via jobRole/jobDescription.
4. Guest support + login history.
5. Free partial + paid unlock.
6. Retry/status/queue handling.

Tambahkan differentiation lewat ATS parse preview, before-after rewrite, JD keyword heatmap, dan version comparison.
