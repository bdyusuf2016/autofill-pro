// Passport Information Parser - AutoFill Pro v2.6
// Parses ICAO Doc 9303 standard MRZ (Machine Readable Zone) and passport fields

class PassportParser {
  constructor() {
    this.enableMRZ = true; // MRZ feature enabled for accurate passport parsing
    this.isoCountryCodes = {
      BGD: "Bangladesh",
      USA: "United States",
      IND: "India",
      GBR: "United Kingdom",
      CAN: "Canada",
      AUS: "Australia",
      SAU: "Saudi Arabia",
      ARE: "United Arab Emirates",
      MYS: "Malaysia",
      SGP: "Singapore",
      PAK: "Pakistan",
      NPL: "Nepal",
      LKA: "Sri Lanka",
      MDV: "Maldives",
      JPN: "Japan",
      KOR: "South Korea",
      CHN: "China",
      DEU: "Germany",
      FRA: "France",
      ITA: "Italy",
      ESP: "Spain",
      TUR: "Turkey",
      QAT: "Qatar",
      KWT: "Kuwait",
      OMN: "Oman",
      BHR: "Bahrain",
    };
  }

  /**
   * Main entry point to parse passport data from raw text or OCR output
   * @param {string} text 
   * @returns {Object} Extracted passport details & validation status
   */
  sanitizePassportInputText(text) {
    if (!text) return "";
    // Step 1: Remove ALL characters outside basic ASCII printable (space to tilde) + Bengali + newlines
    let cleaned = "";
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (
        (code >= 0x20 && code <= 0x7E) ||  // Basic ASCII printable (space to ~)
        (code >= 0x0980 && code <= 0x09FF) || // Bengali Unicode block
        code === 0x0A || code === 0x0D || code === 0x09 // newline, carriage return, tab
      ) {
        cleaned += text[i];
      }
    }
    // Step 2: Collapse multiple spaces/blank lines
    cleaned = cleaned.replace(/[ \t]{3,}/g, "  ").replace(/(\r?\n){3,}/g, "\n\n").trim();
    return cleaned;
  }

  parseText(text) {
    const rawText = String(text || "").trim();
    if (!rawText) {
      return {
        success: false,
        error: "No text provided for passport parsing",
      };
    }

    const sanitizedText = this.sanitizePassportInputText(rawText);
    if (!sanitizedText) {
      return {
        success: false,
        error: "Input text contains no recognizable text content",
      };
    }

    // Step 1: Try MRZ parsing first (most accurate with checksum validation)
    if (this.enableMRZ) {
      const mrzResult = this.extractAndParseMRZ(sanitizedText);
      if (mrzResult && mrzResult.success) {
        // Merge extra visual fields (father, mother, address, etc.) into MRZ result
        const extraFields = this.extractExtraPassportFields(sanitizedText);
        if (extraFields) {
          const d = mrzResult.data;
          if (extraFields.fatherName && !d.fatherName) d.fatherName = extraFields.fatherName;
          if (extraFields.motherName && !d.motherName) d.motherName = extraFields.motherName;
          if (extraFields.spouseName && !d.spouseName) d.spouseName = extraFields.spouseName;
          if (extraFields.guardianName && !d.guardianName) d.guardianName = extraFields.guardianName;
          if (extraFields.emergencyContactName && !d.emergencyContactName) d.emergencyContactName = extraFields.emergencyContactName;
          if (extraFields.emergencyRelationship && !d.emergencyRelationship) d.emergencyRelationship = extraFields.emergencyRelationship;
          if (extraFields.emergencyAddress && !d.emergencyAddress) d.emergencyAddress = extraFields.emergencyAddress;
          if (extraFields.permanentAddress && !d.permanentAddress) d.permanentAddress = extraFields.permanentAddress;
          if (extraFields.mobile && !d.mobile) d.mobile = extraFields.mobile;
          if (extraFields.placeOfBirth && !d.placeOfBirth) d.placeOfBirth = extraFields.placeOfBirth;
          if (extraFields.issueDate && !d.issueDate) d.issueDate = extraFields.issueDate;
          if (extraFields.issuingAuthority && !d.issuingAuthority) d.issuingAuthority = extraFields.issuingAuthority;
          if (extraFields.prevPassportNo && !d.prevPassportNo) d.prevPassportNo = extraFields.prevPassportNo;
        }
        return mrzResult;
      }
    }

    // Step 2: Fallback to key-value visual zone parsing
    const keyValueResult = this.parseKeyValuePassportText(sanitizedText);
    if (keyValueResult && keyValueResult.success) {
      return keyValueResult;
    }

    return {
      success: false,
      error: "Could not find recognizable passport fields in the input text",
    };
  }

  decodeUtf16BeHexInText(text) {
    if (!text) return "";
    return text.replace(/(?:FEFF|<FEFF)([0-9A-Fa-f]{4,})>?/gi, (full, hex) => {
      try {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
          bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
        }
        const decoded = new TextDecoder("utf-16be").decode(bytes).trim();
        return decoded || full;
      } catch (e) {
        return full;
      }
    });
  }



  extractExtraPassportFields(text) {
    const fields = {};

    const fatherMatch = text.match(/(?:Father's\s*Name|পিতার\s*নাম)\s*[:\-]?\s*([^\r\n]+)/i);
    if (fatherMatch) {
      fields.fatherName = fatherMatch[1].trim();
    }

    const motherMatch = text.match(/(?:Mother's\s*Name|মাতার\s*নাম)\s*[:\-]?\s*([^\r\n]+)/i);
    if (motherMatch) {
      fields.motherName = motherMatch[1].trim();
    }

    const spouseMatch = text.match(/(?:Spouse's\s*Name|Spouse\s*Name|husband's\s*Name|wife's\s*Name|স্বামী\/স্ত্রীর\s*নাম|স্বামীর\s*নাম|স্ত্রীর\s*নাম)\s*[:\-]?\s*([^\r\n]+)/i);
    if (spouseMatch && spouseMatch[1].trim()) {
      fields.spouseName = spouseMatch[1].trim();
    }

    const guardianMatch = text.match(/(?:Legal\s*Guardian's\s*Name|অভিভাবকের\s*নাম)\s*[:\-]?\s*([^\r\n]+)/i);
    if (guardianMatch && guardianMatch[1].trim()) {
      fields.guardianName = guardianMatch[1].trim();
    }

    const emergencyNameMatch = text.match(/(?:Emergency\s*Contact\s*Name|Emergency\s*Contact|In\s*case\s*of\s*emergency\s*notify|জরুরি\s*যোগাযোগের\s*ব্যক্তির\s*নাম|জরুরি\s*যোগাযোগ)\s*[:\-]?\s*([^\r\n]+)/i);
    if (emergencyNameMatch && emergencyNameMatch[1].trim()) {
      fields.emergencyContactName = emergencyNameMatch[1].trim();
    }

    const relationMatch = text.match(/(?:Relationship|Relation|সম্পর্ক)\s*[:\-]?\s*([^\r\n]+)/i);
    if (relationMatch && relationMatch[1].trim()) {
      fields.emergencyRelationship = relationMatch[1].trim();
    }

    const emergencyAddrMatch = text.match(/(?:Emergency\s*Contact\s*Address|Emergency\s*Address|যোগাযোগের\s*ঠিকানা)\s*[:\-]?\s*([^\r\n]+)/i);
    if (emergencyAddrMatch && emergencyAddrMatch[1].trim()) {
      fields.emergencyAddress = emergencyAddrMatch[1].trim();
    }

    const prevPassportMatch = text.match(/(?:Previous\s*Passport\s*No\.?|Old\s*Passport\s*No\.?|পূর্ববর্তী\s*পাসপোর্ট\s*নং)\s*[:\-]?\s*([A-Z0-9]{6,12})/i);
    if (prevPassportMatch && prevPassportMatch[1].trim()) {
      fields.prevPassportNo = prevPassportMatch[1].trim().toUpperCase();
    }

    const placeOfBirthMatch = text.match(/(?:Place\s*of\s*Birth|জন্মস্থান)\s*[:\-]?\s*([^\r\n]+)/i);
    if (placeOfBirthMatch) {
      fields.placeOfBirth = placeOfBirthMatch[1].trim();
    }

    const addressMatch = text.match(/(?:Permanent\s*Address|ঠিকানা)\s*[:\-]?\s*([^\r\n]+)/i);
    if (addressMatch) {
      fields.permanentAddress = addressMatch[1].trim();
    }

    const phoneMatch = text.match(/(?:Telephone\s*No|Phone|Mobile|মোবাইল|টেলিফোন)\s*[:\-]?\s*([\+\d\s\-]{10,18})/i);
    if (phoneMatch) {
      fields.mobile = phoneMatch[1].trim().replace(/\s+/g, "");
    }

    const issueDateMatch = text.match(/(?:Date\s*of\s*Issue|প্রদানের\s*তারিখ)\s*[:\-]?\s*([^\r\n]+)/i);
    if (issueDateMatch) {
      fields.issueDate = issueDateMatch[1].trim();
    }

    const authorityMatch = text.match(/(?:Issuing\s*Authority|প্রদানকারী\s*কর্তৃপক্ষ)\s*[:\-]?\s*([^\r\n]+)/i);
    if (authorityMatch) {
      fields.issuingAuthority = authorityMatch[1].trim();
    }

    return fields;
  }

  /**
   * Extract and parse MRZ lines from a multi-line text block
   * Supports TD3 (2x44), TD1 (3x30), TD2 (2x36)
   */
  extractAndParseMRZ(text) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim().toUpperCase().replace(/\s+/g, ""))
      .filter((line) => line.length >= 25);

    let fallbackMrz = null;

    // Look for TD3 (Standard Passport - 2 lines of 44 characters)
    for (let i = 0; i < lines.length - 1; i++) {
      const line1 = this.cleanMrzLine(lines[i], 44);
      const line2 = this.cleanMrzLine(lines[i + 1], 44);

      if (this.isTD3Line1(line1) && this.isTD3Line2(line2)) {
        const parsed = this.parseTD3(line1, line2);
        if (parsed && parsed.success) {
          if (parsed.isValidChecksum) {
            return parsed;
          }
          if (!fallbackMrz) {
            fallbackMrz = parsed;
          }
        }
      } else if (line1.startsWith("P") && line2.length >= 30) {
        // Fuzzy MRZ parser fallback for noisy/corrupted OCR scans
        const fuzzyParsed = this.parseFuzzyMRZ(line1, line2);
        if (fuzzyParsed && fuzzyParsed.success && !fallbackMrz) {
          fallbackMrz = fuzzyParsed;
        }
      }
    }

    // Look for TD1 (ID / Passport Card - 3 lines of 30 characters)
    for (let i = 0; i < lines.length - 2; i++) {
      const line1 = this.cleanMrzLine(lines[i], 30);
      const line2 = this.cleanMrzLine(lines[i + 1], 30);
      const line3 = this.cleanMrzLine(lines[i + 2], 30);

      if (line1.length === 30 && line2.length === 30 && line3.length === 30) {
        if (/^[A-Z0-9<]{30}$/.test(line1) && /^[A-Z0-9<]{30}$/.test(line2)) {
          const td1Parsed = this.parseTD1(line1, line2, line3);
          if (td1Parsed && td1Parsed.success) {
            if (td1Parsed.isValidChecksum) {
              return td1Parsed;
            }
            if (!fallbackMrz) {
              fallbackMrz = td1Parsed;
            }
          }
        }
      }
    }

    return fallbackMrz;
  }

  parseFuzzyMRZ(line1, line2) {
    try {
      // 1. Extract name parts from Line 1 (split by '<<' or '<')
      const nameRaw = line1.substring(2);
      const nameParts = nameRaw.split("<<").map((p) => p.replace(/</g, " ").trim()).filter(Boolean);

      let surname = nameParts[0] || "";
      let givenName = nameParts[1] || "";
      let fullName = `${surname} ${givenName}`.trim() || surname || givenName;

      // Clean noise characters from name
      fullName = fullName.replace(/[^A-Za-z\s]/g, " ").replace(/\s+/g, " ").trim();

      // 2. Extract numbers & dates from Line 2 using OCR digit substitution
      const fixDigits = (str) =>
        str
          .replace(/O/g, "0")
          .replace(/[IL]/g, "1")
          .replace(/S/g, "5")
          .replace(/B/g, "8")
          .replace(/Z/g, "2");

      const sanitizedLine2 = fixDigits(line2);

      // Extract Passport Number (first 9 characters or matching pattern)
      let passportNo = sanitizedLine2.substring(0, 9).replace(/</g, "").toUpperCase();
      if (!/^[A-Z0-9]{6,9}$/.test(passportNo)) {
        const pMatch = sanitizedLine2.match(/([A-Z]\d{7,8}|\d{8,9})/);
        if (pMatch) passportNo = pMatch[1];
      }

      // Extract DOB (chars 13-18)
      const dobRaw = sanitizedLine2.substring(13, 19);
      const dob = /^\d{6}$/.test(dobRaw) ? this.formatMrzDate(dobRaw, true) : "";

      // Extract Expiry Date (chars 21-27)
      const expiryRaw = sanitizedLine2.substring(21, 27);
      const expiryDate = /^\d{6}$/.test(expiryRaw) ? this.formatMrzDate(expiryRaw, false) : "";

      // Extract Personal/NID No (chars 28-41)
      const nidRaw = sanitizedLine2.substring(28, 41).replace(/</g, "");
      const nidNo = /^\d{10,14}$/.test(nidRaw) ? nidRaw : "";

      return {
        success: true,
        type: "MRZ_TD3_FUZZY",
        isValidChecksum: false,
        data: {
          documentType: "Passport (Fuzzy MRZ)",
          passportNo,
          fullName: fullName || "Passport Holder",
          surname,
          givenName,
          dob,
          expiryDate,
          nationality: "BGD",
          nationalityName: "Bangladesh",
          issuingCountry: "BGD",
          nidNo,
          mrzLines: [line1, line2],
        },
      };
    } catch (e) {
      return null;
    }
  }

  cleanMrzLine(line, targetLength) {
    if (!line) return "";
    // 1. Replace common OCR filler character misreads with '<'
    let cleaned = line
      .replace(/[«‹\(\)\[\]\{\}«»—\-_|/\\]/g, "<")
      .replace(/[^A-Z0-9<]/g, "");

    // 2. Pad or truncate to target length
    if (cleaned.length > targetLength) {
      cleaned = cleaned.substring(0, targetLength);
    } else if (cleaned.length < targetLength && cleaned.length >= targetLength - 10) {
      cleaned = cleaned.padEnd(targetLength, "<");
    }
    return cleaned;
  }

  padOrTruncateMRZ(line, length) {
    let cleaned = line
      .replace(/[«‹\(\)\[\]\{\}«»—\-_|/\\]/g, "<")
      .replace(/[^A-Z0-9<]/g, "");
    if (cleaned.length < length) {
      cleaned = cleaned.padEnd(length, "<");
    } else if (cleaned.length > length) {
      cleaned = cleaned.substring(0, length);
    }
    return cleaned;
  }

  isTD3Line1(line) {
    if (!line || line.length !== 44) return false;
    // TD3 Line 1 starts with P (or I/V)
    if (!line.startsWith("P") && !line.startsWith("I") && !line.startsWith("V")) return false;
    const fillerCount = (line.match(/</g) || []).length;
    if (fillerCount < 2) return false;
    if (line.includes("FEFF") || line.includes("AUTHOR") || line.includes("TITLE") || line.includes("CREATOR") || line.includes("PRODUCER")) return false;
    return /^[P|I|V][A-Z0-9<]{43}$/.test(line);
  }

  isTD3Line2(line) {
    if (!line || line.length !== 44) return false;
    if (line.includes("FEFF") || line.includes("AUTHOR") || line.includes("TITLE") || line.includes("CREATOR") || line.includes("PRODUCER")) return false;

    // Line 2 MUST contain passport number (chars 0-8) and DOB/Expiry dates
    // Sanitize possible O->0, I->1 in date positions for check
    let sanitizedLine = line;
    const fixDigits = (str) => str.replace(/O/g, "0").replace(/[IL]/g, "1").replace(/S/g, "5").replace(/B/g, "8").replace(/Z/g, "2");

    const dobPart = fixDigits(sanitizedLine.substring(13, 19));
    const expPart = fixDigits(sanitizedLine.substring(21, 27));

    if (!/^\d{6}$/.test(dobPart) || !/^\d{6}$/.test(expPart)) {
      return false;
    }

    return true;
  }

  /**
   * Parse TD3 MRZ (2 lines x 44 chars)
   */
  parseTD3(line1, line2) {
    try {
      // Line 1 breakdown:
      // 0-1: Doc Type (P< / PO / PB / PD etc.)
      // 2-4: Country Code (e.g. BGD)
      // 5-43: Name (SURNAME<<GIVEN<NAMES<<<<...)
      const docType = line1.substring(0, 2).replace(/</g, "");
      const issuingCountryCode = line1.substring(2, 5).replace(/</g, "");
      const nameRaw = line1.substring(5, 44);

      const nameParts = nameRaw.split("<<");
      const surname = (nameParts[0] || "").replace(/</g, " ").trim();
      const givenName = (nameParts[1] || "").replace(/</g, " ").trim();
      const fullName = `${surname} ${givenName}`.trim() || surname || givenName;

      // Line 2 breakdown:
      // 0-8: Passport Number (9 chars)
      // 9: Passport Check Digit
      // 10-12: Nationality (3 chars)
      // 13-18: DOB (YYMMDD)
      // 19: DOB Check Digit
      // 20: Sex (M/F/<)
      // 21-26: Expiry Date (YYMMDD)
      // 27: Expiry Check Digit
      // 28-41: Personal Number / NID (14 chars)
      // 42: Personal Check Digit
      // 43: Composite Check Digit
      const passportNoRaw = line2.substring(0, 9).replace(/</g, "");
      const passportNoCheckDigit = line2.substring(9, 10);
      const nationalityCode = line2.substring(10, 13).replace(/</g, "");
      const dobRaw = line2.substring(13, 19);
      const dobCheckDigit = line2.substring(19, 20);
      const sexChar = line2.substring(20, 21);
      const expiryRaw = line2.substring(21, 27);
      const expiryCheckDigit = line2.substring(27, 28);
      const personalNoRaw = line2.substring(28, 41).replace(/</g, "");
      const compositeCheckDigit = line2.substring(43, 44);

      // Validate check digits
      const validPassportNo = this.validateCheckDigit(passportNoRaw, passportNoCheckDigit);
      const validDob = this.validateCheckDigit(dobRaw, dobCheckDigit);
      const validExpiry = this.validateCheckDigit(expiryRaw, expiryCheckDigit);
      const validComposite = this.validateCheckDigit(
        line2.substring(0, 10) + line2.substring(13, 20) + line2.substring(21, 43),
        compositeCheckDigit
      );

      const isValidChecksum = validPassportNo && validDob && validExpiry;

      // Format values
      const dob = this.formatMrzDate(dobRaw, true);
      const expiryDate = this.formatMrzDate(expiryRaw, false);
      const gender = this.formatGender(sexChar);
      const countryName = this.isoCountryCodes[nationalityCode] || this.isoCountryCodes[issuingCountryCode] || nationalityCode;

      return {
        success: true,
        type: "MRZ_TD3",
        isValidChecksum,
        data: {
          documentType: docType || "Passport",
          passportNo: passportNoRaw,
          fullName,
          surname,
          givenName,
          dob,
          dobRaw,
          gender,
          expiryDate,
          expiryRaw,
          nationality: nationalityCode,
          nationalityName: countryName,
          issuingCountry: issuingCountryCode,
          nidNo: personalNoRaw,
          mrzLines: [line1, line2],
        },
        checksums: {
          passportNo: validPassportNo,
          dob: validDob,
          expiry: validExpiry,
          composite: validComposite,
        },
      };
    } catch (err) {
      console.error("Error parsing TD3 MRZ:", err);
      return null;
    }
  }

  /**
   * Parse TD1 MRZ (3 lines x 30 chars)
   */
  parseTD1(line1, line2, line3) {
    try {
      const docType = line1.substring(0, 2).replace(/</g, "");
      const countryCode = line1.substring(2, 5).replace(/</g, "");
      const passportNoRaw = line1.substring(5, 14).replace(/</g, "");
      const passportNoCheck = line1.substring(14, 15);

      const dobRaw = line2.substring(0, 6);
      const dobCheck = line2.substring(6, 7);
      const sexChar = line2.substring(7, 8);
      const expiryRaw = line2.substring(8, 14);
      const expiryCheck = line2.substring(14, 15);
      const nationalityCode = line2.substring(15, 18).replace(/</g, "");

      const nameRaw = line3.substring(0, 30);
      const nameParts = nameRaw.split("<<");
      const surname = (nameParts[0] || "").replace(/</g, " ").trim();
      const givenName = (nameParts[1] || "").replace(/</g, " ").trim();
      const fullName = `${surname} ${givenName}`.trim();

      const validPassportNo = this.validateCheckDigit(passportNoRaw, passportNoCheck);
      const validDob = this.validateCheckDigit(dobRaw, dobCheck);
      const validExpiry = this.validateCheckDigit(expiryRaw, expiryCheck);

      return {
        success: true,
        type: "MRZ_TD1",
        isValidChecksum: validPassportNo && validDob && validExpiry,
        data: {
          documentType: docType || "ID/Passport Card",
          passportNo: passportNoRaw,
          fullName,
          surname,
          givenName,
          dob: this.formatMrzDate(dobRaw, true),
          gender: this.formatGender(sexChar),
          expiryDate: this.formatMrzDate(expiryRaw, false),
          nationality: nationalityCode,
          nationalityName: this.isoCountryCodes[nationalityCode] || nationalityCode,
          issuingCountry: countryCode,
          mrzLines: [line1, line2, line3],
        },
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * ICAO 7-3-1 Check Digit Algorithm
   */
  validateCheckDigit(str, checkDigit) {
    if (!checkDigit || checkDigit === "<") return true;
    const computed = this.computeCheckDigit(str);
    return String(computed) === String(checkDigit);
  }

  computeCheckDigit(str) {
    const weights = [7, 3, 1];
    let sum = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      let val = 0;
      if (char >= "0" && char <= "9") {
        val = parseInt(char, 10);
      } else if (char >= "A" && char <= "Z") {
        val = char.charCodeAt(0) - 55;
      } else {
        val = 0; // '<' is 0
      }
      sum += val * weights[i % 3];
    }

    return sum % 10;
  }

  formatMrzDate(yyMMdd, isDob = true) {
    if (!yyMMdd || yyMMdd.length !== 6 || !/^\d+$/.test(yyMMdd)) {
      return yyMMdd;
    }

    const yy = parseInt(yyMMdd.substring(0, 2), 10);
    const mm = yyMMdd.substring(2, 4);
    const dd = yyMMdd.substring(4, 6);

    const currentYear = new Date().getFullYear();
    const currentYY = currentYear % 100;

    let fullYear = 0;
    if (isDob) {
      fullYear = yy > currentYY ? 1900 + yy : 2000 + yy;
    } else {
      fullYear = 2000 + yy;
    }

    return `${fullYear}-${mm}-${dd}`;
  }

  formatGender(sexChar) {
    switch (sexChar) {
      case "M":
        return "Male";
      case "F":
        return "Female";
      default:
        return "Unspecified";
    }
  }

  normalizeVisualDate(str) {
    if (!str) return "";
    const clean = str.trim().toUpperCase();

    const monthMap = {
      JAN: "01", FEB: "02", MAR: "03", APR: "04", MAY: "05", JUN: "06",
      JUL: "07", AUG: "08", SEP: "09", OCT: "10", NOV: "11", DEC: "12"
    };

    const ddmmyyyyMatch = clean.match(/^(\d{1,2})\s*([A-Z]{3})\s*(\d{4})$/);
    if (ddmmyyyyMatch) {
      const dd = ddmmyyyyMatch[1].padStart(2, "0");
      const mm = monthMap[ddmmyyyyMatch[2]] || "01";
      const yyyy = ddmmyyyyMatch[3];
      return `${yyyy}-${mm}-${dd}`;
    }

    const isoMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (isoMatch) {
      return `${isoMatch[1]}-${isoMatch[2].padStart(2, "0")}-${isoMatch[3].padStart(2, "0")}`;
    }

    const stdMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (stdMatch) {
      return `${stdMatch[3]}-${stdMatch[2].padStart(2, "0")}-${stdMatch[1].padStart(2, "0")}`;
    }

    return clean;
  }

  /**
   * Key-Value Regex Fallback for Non-MRZ Passport scans or copied details
   */
  parseKeyValuePassportText(text) {
    const fields = {};

    const isNoise = (val) => {
      if (!val) return true;
      const lower = String(val).toLowerCase();
      return (
        lower.includes("author") ||
        lower.includes("creator") ||
        lower.includes("title") ||
        lower.includes("producer") ||
        lower.includes("feff") ||
        lower.includes("object") ||
        lower.includes("stream")
      );
    };

    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

    for (const line of lines) {
      if (isNoise(line)) continue;
      if (line.includes("<<") || line.startsWith("P<")) continue; // Skip raw MRZ lines in visual parser
      if (/^(?:personal\s*data|emergency\s*contact|people's\s*republic|bangladesh|passport)\s*$/i.test(line)) continue;

      // 1. Surname
      if (!fields.surname && /(?:surname|last\s*name|বংশগত\s*নাম)/i.test(line)) {
        const val = line.replace(/^(?:surname|last\s*name|বংশগত\s*নাম)\s*[:\-]?\s*/i, "").trim();
        if (val) fields.surname = val;
      }
      // 2. Given Name
      else if (!fields.givenName && /(?:given\s*name|first\s*name|প্রদত্ত\s*নাম)/i.test(line)) {
        const val = line.replace(/^(?:given\s*name|first\s*name|প্রদত্ত\s*নাম)\s*[:\-]?\s*/i, "").trim();
        if (val) fields.givenName = val;
      }
      // 3. Father's Name
      else if (!fields.fatherName && /(?:father(?:'s)?\s*name|পিতার\s*নাম)/i.test(line)) {
        const val = line.replace(/^(?:father(?:'s)?\s*name|পিতার\s*নাম)\s*[:\-]?\s*/i, "").trim();
        if (val) fields.fatherName = val;
      }
      // 4. Mother's Name
      else if (!fields.motherName && /(?:mother(?:'s)?\s*name|মাতার\s*নাম)/i.test(line)) {
        const val = line.replace(/^(?:mother(?:'s)?\s*name|মাতার\s*নাম)\s*[:\-]?\s*/i, "").trim();
        if (val) fields.motherName = val;
      }
      // 5. Spouse's Name
      else if (!fields.spouseName && /(?:spouse(?:'s)?\s*name|husband(?:'s)?\s*name|wife(?:'s)?\s*name|স্বামী\/স্ত্রীর\s*নাম|স্বামীর\s*নাম|স্ত্রীর\s*নাম)/i.test(line)) {
        const val = line.replace(/^(?:spouse(?:'s)?\s*name|husband(?:'s)?\s*name|wife(?:'s)?\s*name|স্বামী\/স্ত্রীর\s*নাম|স্বামীর\s*নাম|স্ত্রীর\s*নাম)\s*[:\-]?\s*/i, "").trim();
        if (val) fields.spouseName = val;
      }
      // 6. Legal Guardian's Name
      else if (!fields.guardianName && /(?:legal\s*guardian(?:'s)?\s*name|guardian(?:'s)?\s*name|অভিভাবকের\s*নাম)/i.test(line)) {
        const val = line.replace(/^(?:legal\s*guardian(?:'s)?\s*name|guardian(?:'s)?\s*name|অভিভাবকের\s*নাম)\s*[:\-]?\s*/i, "").trim();
        if (val) fields.guardianName = val;
      }
      // 7. Emergency Contact Name
      else if (!fields.emergencyContactName && /(?:emergency\s*contact\s*name|in\s*case\s*of\s*emergency\s*notify|জরুরি\s*যোগাযোগের\s*ব্যক্তির\s*নাম)/i.test(line)) {
        const val = line.replace(/^(?:emergency\s*contact\s*name|in\s*case\s*of\s*emergency\s*notify|জরুরি\s*যোগাযোগের\s*ব্যক্তির\s*নাম)\s*[:\-]?\s*/i, "").trim();
        if (val && !/address|telephone|phone|mobile|relationship|relation/i.test(val)) {
          fields.emergencyContactName = val;
        }
      }
      // 8. Applicant's / Full Name
      else if (!fields.fullName && /(?:applicant(?:'s)?\s*name|full\s*name|holder(?:'s)?\s*name|আবেদনকারীর\s*নাম|^name)/i.test(line)) {
        if (!/^(?:father|mother|spouse|guardian|given|surname|emergency)/i.test(line)) {
          const val = line.replace(/^(?:applicant(?:'s)?\s*name|full\s*name|holder(?:'s)?\s*name|আবেদনকারীর\s*নাম|name)\s*[:\-]?\s*/i, "").trim();
          if (val) fields.fullName = val;
        }
      }
      // 9. Passport Number
      else if (!fields.passportNo && /(?:passport\s*(?:no|number|id)|পাসপোর্ট\s*(?:নম্বর|নং))/i.test(line)) {
        const val = line.replace(/^(?:passport\s*(?:no|number|id)|পাসপোর্ট\s*(?:নম্বর|নং))\s*[:\-]?\s*/i, "").trim();
        const pMatch = val.match(/([A-Z0-9]{6,12})/i);
        if (pMatch) fields.passportNo = pMatch[1].toUpperCase();
      }
      // 10. Date of Birth
      else if (!fields.dob && /(?:date\s*of\s*birth|dob|birth\s*date|জন্ম\s*তারিখ)/i.test(line)) {
        const dMatch = line.match(/(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}|\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})/i);
        if (dMatch) fields.dob = this.normalizeVisualDate(dMatch[1]);
      }
      // 11. Date of Expiry
      else if (!fields.expiryDate && /(?:date\s*of\s*expiry|expiry\s*date|মেয়াদের\s*তারিখ|মেয়াদ)/i.test(line)) {
        const dMatch = line.match(/(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}|\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})/i);
        if (dMatch) fields.expiryDate = this.normalizeVisualDate(dMatch[1]);
      }
      // 12. Date of Issue
      else if (!fields.issueDate && /(?:date\s*of\s*issue|issue\s*date|প্রদানের\s*তারিখ)/i.test(line)) {
        const dMatch = line.match(/(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}|\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})/i);
        if (dMatch) fields.issueDate = this.normalizeVisualDate(dMatch[1]);
      }
      // 13. Sex / Gender
      else if (!fields.gender && /(?:sex|gender|লিঙ্গ)/i.test(line)) {
        const gMatch = line.match(/(Male|Female|M|F|পুরুষ|মহিলা)/i);
        if (gMatch) {
          const g = gMatch[1].toUpperCase();
          fields.gender = g.startsWith("M") || g.includes("পুরুষ") ? "Male" : "Female";
        }
      }
      // 14. Place of Birth
      else if (!fields.placeOfBirth && /(?:place\s*of\s*birth|district\s*of\s*birth|জন্মস্থান|জন্ম\s*জেলা)/i.test(line)) {
        const val = line.replace(/^(?:place\s*of\s*birth|district\s*of\s*birth|জন্মস্থান|জন্ম\s*জেলা)\s*[:\-]?\s*/i, "").trim();
        if (val) fields.placeOfBirth = val;
      }
      // 15. Nationality
      else if (!fields.nationalityName && /(?:nationality|country|জাতীয়তা|দেশ)/i.test(line)) {
        const val = line.replace(/^(?:nationality|country|জাতীয়তা|দেশ)\s*[:\-]?\s*/i, "").trim();
        if (val) fields.nationalityName = val;
      }
      // 16. NID / Personal No
      else if (!fields.nidNo && /(?:national\s*id|nid\s*no|nid|personal\s*no|ব্যক্তিগত\s*নং|জাতীয়\s*পরিচয়পত্র)/i.test(line)) {
        const nMatch = line.match(/(\d{10,17})/);
        if (nMatch) fields.nidNo = nMatch[1];
      }
      // 17. Permanent Address
      else if (!fields.permanentAddress && /(?:permanent\s*address|ঠিকানা)/i.test(line)) {
        const val = line.replace(/^(?:permanent\s*address|ঠিকানা)\s*[:\-]?\s*/i, "").trim();
        if (val) fields.permanentAddress = val;
      }
      // 18. Emergency Address
      else if (!fields.emergencyAddress && /(?:emergency\s*contact\s*address|emergency\s*address|যোগাযোগের\s*ঠিকানা)/i.test(line)) {
        const val = line.replace(/^(?:emergency\s*contact\s*address|emergency\s*address|যোগাযোগের\s*ঠিকানা)\s*[:\-]?\s*/i, "").trim();
        if (val) fields.emergencyAddress = val;
      }
      // 19. Relationship
      else if (!fields.emergencyRelationship && /(?:relationship|relation|সম্পর্ক)/i.test(line)) {
        const val = line.replace(/^(?:relationship|relation|সম্পর্ক)\s*[:\-]?\s*/i, "").trim();
        if (val) fields.emergencyRelationship = val;
      }
      // 20. Issuing Authority
      else if (!fields.issuingAuthority && /(?:issuing\s*authority|প্রদানকারী\s*কর্তৃপক্ষ)/i.test(line)) {
        const val = line.replace(/^(?:issuing\s*authority|প্রদানকারী\s*কর্তৃপক্ষ)\s*[:\-]?\s*/i, "").trim();
        if (val) fields.issuingAuthority = val;
      }
      // 21. Phone / Mobile
      else if (!fields.mobile && /(?:telephone\s*no|phone|mobile|মোবাইল|টেলিফোন)/i.test(line)) {
        const pMatch = line.match(/([\+\d\s\-]{10,18})/);
        if (pMatch) fields.mobile = pMatch[1].trim().replace(/\s+/g, "");
      }
      // 22. Previous Passport No
      else if (!fields.prevPassportNo && /(?:previous\s*passport\s*no\.?|old\s*passport\s*no\.?|পূর্ববর্তী\s*পাসপোর্ট\s*নং)/i.test(line)) {
        const pMatch = line.match(/([A-Z0-9]{6,12})/i);
        if (pMatch) fields.prevPassportNo = pMatch[1].toUpperCase();
      }
    }

    // Fallback: Standalone Passport Number match (e.g. A17160316, E08123456, B01234567)
    if (!fields.passportNo) {
      const standalonePassport = text.match(/\b([A-Z]\d{8})\b/i);
      if (standalonePassport && !isNoise(standalonePassport[1])) {
        fields.passportNo = standalonePassport[1].toUpperCase();
      }
    }

    // Fallback: Standalone NID / Personal No match (10, 13, or 17 digits)
    if (!fields.nidNo) {
      const standaloneNid = text.match(/\b(\d{10}|\d{13}|\d{17})\b/);
      if (standaloneNid && !isNoise(standaloneNid[1])) {
        fields.nidNo = standaloneNid[1];
      }
    }

    // Fallback: Standalone Date matches (DOB, Issue Date, Expiry Date)
    const dateMatches = text.match(/\b(\d{1,2}\s+[A-Za-z]{3}\s+\d{4}|\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}|\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})\b/gi);
    if (dateMatches && dateMatches.length > 0) {
      const parsedDates = dateMatches
        .map((d) => this.normalizeVisualDate(d))
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
        .sort(); // Chronological sort

      if (parsedDates.length > 0) {
        if (!fields.dob) {
          fields.dob = parsedDates[0]; // Earliest date is DOB
        }
        if (parsedDates.length >= 2 && !fields.expiryDate) {
          fields.expiryDate = parsedDates[parsedDates.length - 1]; // Latest date is Expiry
        }
        if (parsedDates.length >= 3 && !fields.issueDate) {
          fields.issueDate = parsedDates[1]; // Middle date is Issue Date
        }
      }
    }

    // Fallback: Standalone Name lines if name not matched by label
    if (!fields.fullName && !fields.givenName && !fields.surname) {
      for (const line of lines) {
        const trimmed = line.trim();
        if (
          /^[A-Z][A-Z. ]{2,34}$/.test(trimmed) &&  // STRICTLY uppercase letters only
          trimmed.split(/\s+/).length >= 2 &&         // At least 2 words (first + last name)
          trimmed.split(/\s+/).every((w) => w.length >= 2) && // Each word at least 2 chars
          !isNoise(trimmed) &&
          !/PASSPORT|REPUBLIC|BANGLADESH|NATIONALITY|FATHER|MOTHER|ADDRESS|CONTACT|EMERGENCY|BIRTH|EXPIRY|ISSUE|NUMBER|AUTHORITY|PEOPLE|GOVERNMENT/i.test(trimmed)
        ) {
          fields.fullName = trimmed;
          break;
        }
      }
    }
    // Clean and normalize extracted fields
    if (fields.passportNo) {
      fields.passportNo = fields.passportNo.replace(/\s+/g, "").toUpperCase();
    }
    if (fields.dob) {
      fields.dob = this.normalizeVisualDate(fields.dob);
    }
    if (fields.expiryDate) {
      fields.expiryDate = this.normalizeVisualDate(fields.expiryDate);
    }
    if (fields.issueDate) {
      fields.issueDate = this.normalizeVisualDate(fields.issueDate);
    }

    // Allow display if ANY passport field (Name, Passport No, Father, Mother, Address, NID, etc.) is extracted
    const hasAnyField = Object.values(fields).some((v) => Boolean(v && String(v).trim()));
    if (!hasAnyField) {
      return null;
    }

    const full = fields.fullName || `${fields.givenName || ""} ${fields.surname || ""}`.trim();
    return {
      success: true,
      type: "VISUAL_ZONE",
      isValidChecksum: true,
      data: {
        documentType: "Passport (Extracted)",
        passportNo: fields.passportNo || "",
        fullName: full,
        surname: fields.surname || "",
        givenName: fields.givenName || "",
          fatherName: fields.fatherName || "",
          motherName: fields.motherName || "",
          spouseName: fields.spouseName || "",
          guardianName: fields.guardianName || "",
          emergencyContactName: fields.emergencyContactName || "",
          emergencyRelationship: fields.emergencyRelationship || "",
          emergencyAddress: fields.emergencyAddress || "",
          dob: fields.dob || "",
          gender: fields.gender || "",
          expiryDate: fields.expiryDate || "",
          issueDate: fields.issueDate || "",
          issuingAuthority: fields.issuingAuthority || "",
          placeOfBirth: fields.placeOfBirth || "",
          nationality: "BGD",
          nationalityName: fields.nationalityName || "Bangladesh",
          issuingCountry: "BGD",
          nidNo: fields.nidNo || "",
          permanentAddress: fields.permanentAddress || "",
          mobile: fields.mobile || "",
          prevPassportNo: fields.prevPassportNo || "",
        },
      };
    }

    return null;
  }
}

const passportParser = new PassportParser();
