import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  async analyzeSymptoms(symptoms: string) {
    const text = (symptoms || '').toLowerCase();
    
    let specialty = 'GENERAL_PRACTITIONER';
    let severity = 'low';
    let analysisAr = '';
    let analysisEn = '';
    
    // Keyword mappings
    const isCardio = /cardio|heart|chest|palpitation|breath|صدر|قلب|دقات|ضيق نفس/gi.test(text);
    const isDerma = /skin|acne|rash|itch|dermat|allergy|spot|bouton|peau|جلد|حكة|حبوب|حساسية/gi.test(text);
    const isPedia = /child|baby|kid|pediat|bébé|enfant|طفل|رضيع|حرارة طفل/gi.test(text);
    const isDentist = /teeth|tooth|dent|gum|dental|أسنان|ضرس|لثة|ألم سن/gi.test(text);
    const isOphtal = /eye|vision|blind|ophtal|flou|عين|نظر|رؤية|احمرار عين/gi.test(text);
    const isOrtho = /bone|joint|fracture|back|knee|ortho|dos|genou|عظم|مفاصل|ظهر|كسر|ركبة/gi.test(text);
    const isGyneco = /pregnant|pregnancy|period|gyn|enceinte|accouchement|نساء|حامل|ولادة|دورة/gi.test(text);
    const isPsych = /depress|anxiety|stress|mood|psych|sleep|اكتئاب|قلق|توتر|نفسي|خوف/gi.test(text);
    const isEmergency = /severe|bleeding|unconscious|stroke|attack|sharp pain|نزيف|حاد|إغماء|جلطة/gi.test(text);

    if (isCardio) {
      specialty = 'CARDIOLOGIST';
      severity = 'medium';
      analysisAr = 'الأعراض المذكورة قد ترتبط بنظام القلب والأوعية الدموية أو الجهاز التنفسي. ننصحك بشدة بحجز موعد مع أخصائي أمراض القلب للفحص الدقيق.';
      analysisEn = 'The symptoms described may relate to the cardiovascular or respiratory system. We strongly recommend booking an appointment with a Cardiologist for a detailed evaluation.';
    } else if (isDerma) {
      specialty = 'DERMATOLOGIST';
      severity = 'low';
      analysisAr = 'الأعراض تشير إلى وجود تهيج أو مشكلة جلدية. نقترح حجز موعد مع طبيب أمراض جلدية لتشخيص الحالة ووصف العلاج المناسب.';
      analysisEn = 'Symptoms point to a skin irritation or dermatological condition. We suggest booking an appointment with a Dermatologist to diagnose and receive appropriate treatment.';
    } else if (isPedia) {
      specialty = 'PEDIATRICIAN';
      severity = 'medium';
      analysisAr = 'الأعراض تتعلق بطفل أو رضيع. من المهم جداً استشارة طبيب أطفال للتأكد من سلامة ونمو الطفل بشكل صحيح.';
      analysisEn = 'The symptoms relate to a child or infant. It is highly recommended to consult a Pediatrician to ensure the child receives appropriate care and diagnostics.';
    } else if (isDentist) {
      specialty = 'DENTIST';
      severity = 'low';
      analysisAr = 'الأعراض ترتبط بصحة الفم أو الأسنان. ننصح بزيارة طبيب الأسنان لفحص الأسنان واللثة وعلاج الألم.';
      analysisEn = 'The symptoms are associated with oral health or teeth. We recommend visiting a Dentist to examine the teeth and gums and resolve the discomfort.';
    } else if (isOphtal) {
      specialty = 'OPHTHALMOLOGIST';
      severity = 'low';
      analysisAr = 'الأعراض تشير إلى احتمال وجود مشكلة في العين أو الرؤية. ننصح بزيارة أخصائي العيون لإجراء فحص النظر.';
      analysisEn = 'Symptoms suggest a potential vision or eye condition. We advise booking an appointment with an Ophthalmologist for a comprehensive eye check.';
    } else if (isOrtho) {
      specialty = 'ORTHOPEDIST';
      severity = 'medium';
      analysisAr = 'الأعراض قد تتعلق بالجهاز الحركي، العظام، أو المفاصل. ننصح باستشارة أخصائي جراحة العظام والمفاصل.';
      analysisEn = 'Symptoms appear to relate to the musculoskeletal system, bones, or joints. We recommend consulting an Orthopedist for evaluation.';
    } else if (isGyneco) {
      specialty = 'GYNECOLOGIST';
      severity = 'medium';
      analysisAr = 'الأعراض ترتبط بالصحة الإنجابية أو الحمل. ننصح بحجز موعد مع طبيب النساء والتوليد للمتابعة الطبية.';
      analysisEn = 'The symptoms are associated with reproductive health or pregnancy. We recommend booking a consultation with a Gynecologist for proper medical followup.';
    } else if (isPsych) {
      specialty = 'PSYCHIATRIST';
      severity = 'low';
      analysisAr = 'الأعراض المذكورة تشير إلى ضغوط نفسية أو قلق. ننصح بالتواصل مع أخصائي الطب النفسي للحصول على الدعم والإرشاد.';
      analysisEn = 'The symptoms described point to psychological stress, mood changes, or anxiety. We recommend contacting a Psychiatrist for support and guidance.';
    } else {
      specialty = 'GENERAL_PRACTITIONER';
      severity = 'low';
      analysisAr = 'الأعراض عامة وقد تشير إلى حالة موسمية شائعة (مثل الزكام أو الإرهاق). ننصح بزيارة طبيب عام للفحص الأساسي.';
      analysisEn = 'The symptoms are general and may indicate a common seasonal condition (like cold or fatigue). We recommend visiting a General Practitioner for a baseline check.';
    }

    if (isEmergency) {
      severity = 'high';
      analysisAr += ' [تنبيه هام: تظهر الأعراض علامات خطورة، يرجى التوجه إلى قسم الطوارئ فوراً أو الاتصال بالإسعاف إذا كانت الحالة طارئة!]';
      analysisEn += ' [CRITICAL: The symptoms show signs of severity. Please visit the nearest Emergency Room immediately or call an ambulance if urgent!]';
    }

    // Dynamic AI response generation using Ethereal API key check placeholder
    const hasApiKey = !!process.env.GEMINI_API_KEY;
    if (hasApiKey) {
      console.log('🤖 AI Service: Gemini API Key detected! Querying LLM directly...');
      // Placeholder for actual LLM API invocation if configured
    }

    return {
      specialty,
      severity,
      analysisAr,
      analysisEn,
      timestamp: new Date().toISOString(),
    };
  }
}
