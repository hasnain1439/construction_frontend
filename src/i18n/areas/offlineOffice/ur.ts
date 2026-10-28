import type { Widen } from "../../types";
import type * as En from "./en";

export const strings: Widen<typeof En.strings> = {
  title: "آف لائن دفتر",
  desc: "دفتر کا کمپیوٹر کمپنی کے ڈیٹا کی کاپی رکھتا ہے، انٹرنیٹ کے بغیر کام کرتا ہے اور انٹرنیٹ واپس آنے پر کلاؤڈ سے ہم آہنگ ہو جاتا ہے۔",
  notAllowedTitle: "آپ کی کمپنی کے لیے آف لائن دفتر چالو نہیں ہے",
  notAllowedBody: "پہلے پلیٹ فارم ٹیم اسے چالو کرے گی۔ اس کے لیے سپورٹ سے رابطہ کریں۔",
  devicesTitle: "دفتر کے کمپیوٹر",
  devicesDesc:
    "وہ کمپیوٹر جنہوں نے کمپنی کے ڈیٹا کی کاپی رکھنے کی درخواست کی۔ صرف منظور شدہ کمپیوٹر ہم آہنگ ہو سکتے ہیں۔",
  colComputer: "کمپیوٹر",
  colUser: "کس نے سائن ان کیا",
  colRequested: "درخواست",
  colApproved: "منظوری",
  colLastSync: "آخری ہم آہنگی",
  officeComputer: "دفتر کا کمپیوٹر",
  waiting: "منظوری کا انتظار",
  approvedBadge: "منظور",
  approve: "منظور کریں",
  revoke: "منظوری واپس لیں",
  approved: "{name} منظور — اب یہ ہم آہنگ ہو سکتا ہے",
  revoked: "{name} کی منظوری واپس لے لی",
  revokeTitle: "{name} کی منظوری واپس لیں؟",
  revokeBody: "یہ کمپیوٹر دوبارہ منظوری تک کلاؤڈ سے ہم آہنگ نہیں ہو گا۔ کلاؤڈ سے کچھ نہیں مٹایا جاتا۔",
  emptyTitle: "ابھی کوئی دفتر کا کمپیوٹر نہیں",
  emptyBody:
    "سیٹ اپ کا طریقہ: دفتر کے کمپیوٹر پر دفتر کا انسٹالر چلائیں، وہاں مالک یا ایڈمنسٹریٹر اکاؤنٹ سے سائن ان کریں، پھر یہاں اس کمپیوٹر کو منظور کریں۔",
  problemsTitle: "ہم آہنگی کے مسائل",
  problemsDesc:
    "اس دفتر کے کمپیوٹر پر کی گئی تبدیلیاں جو کلاؤڈ نے قبول نہیں کیں۔ ہر صورت میں کلاؤڈ والا ورژن رکھا گیا۔",
  problemsElsewhere:
    "ہم آہنگی کے مسائل صرف دفتر کے کمپیوٹر پر نظر آتے ہیں۔ انہیں دیکھنے کے لیے یہ صفحہ وہاں کھولیں۔",
  problemsEmpty: "ہم آہنگی کا کوئی مسئلہ نہیں",
  problemsEmptyBody: "اس دفتر کے کمپیوٹر کی ہر تبدیلی کلاؤڈ تک پہنچ گئی۔",
  record: "ریکارڈ",
  cloudKept: "کلاؤڈ والا ورژن رکھا گیا",
  colField: "خانہ",
  colOffice: "اس کمپیوٹر پر",
  colCloud: "کلاؤڈ میں",
  noDifference: "کوئی خانہ مختلف نہیں۔",
  deletedOffice: "اس کمپیوٹر پر مٹا دیا گیا",
  missingCloud: "کلاؤڈ میں موجود نہیں",
  showChanges: "تبدیلیاں دیکھیں",
  hideChanges: "تبدیلیاں چھپائیں",
};

export const enums: Widen<typeof En.enums> = {
  syncProblemStatus: {
    CONFLICT: "دونوں جگہ تبدیل ہوا",
    ERROR: "کلاؤڈ نے انکار کیا",
  },
};
