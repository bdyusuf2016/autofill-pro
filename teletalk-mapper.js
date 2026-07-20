// TeleTalk Field Mapper
// Maps PDF form field names to extension profile fields

class TeleTalkMapper {
  constructor() {
    this.fieldMappings = this.buildFieldMappings();
  }

  /**
   * Build comprehensive field mappings
   * Maps various PDF field names to standardized profile fields
   */
  buildFieldMappings() {
    return {
      // Personal Information
      'applicantName': ['Full Name', 'Applicant Name', 'Name', 'full name', 'applicant name', 'নাম'],
      'email': ['Email', 'Email Address', 'E-mail', 'email address', 'ইমেইল'],
      'phone': ['Phone', 'Phone Number', 'Mobile', 'Mobile Number', 'Contact Number', 'ফোন', 'মোবাইল'],
      'fatherName': ['Father\'s Name', 'Father Name', 'পিতার নাম'],
      'motherName': ['Mother\'s Name', 'Mother Name', 'মাতার নাম'],

      // Address
      'presentAddress': ['Present Address', 'Current Address', 'বর্তমান ঠিকানা'],
      'permanentAddress': ['Permanent Address', 'Address', 'স্থায়ী ঠিকানা'],
      'village': ['Village', 'গ্রাম'],
      'upazila': ['Upazila', 'Thana', 'উপজেলা'],
      'district': ['District', 'জেলা'],

      // Education
      'education': ['Education', 'Educational Qualification', 'Qualification', 'শিক্ষা'],
      'degree': ['Degree', 'Highest Degree', 'ডিগ্রি'],
      'institution': ['Institution', 'University', 'School', 'প্রতিষ্ঠান'],
      'passingYear': ['Passing Year', 'Year of Passing', 'পাসের বছর'],

      // Experience
      'experience': ['Experience', 'Work Experience', 'অভিজ্ঞতা'],
      'previousJob': ['Previous Job', 'Previous Employer', 'পূর্ববর্তী চাকরি'],
      'duration': ['Duration', 'Experience Duration', 'সময়কাল'],

      // Additional
      'nid': ['NID', 'National ID', 'এনআইডি'],
      'passport': ['Passport', 'Passport Number', 'পাসপোর্ট'],
      'dob': ['Date of Birth', 'DOB', 'Birth Date', 'জন্মতারিখ'],
      'gender': ['Gender', 'Sex', 'লিঙ্গ']
    };
  }

  /**
   * Map extracted PDF fields to profile fields
   * @param {Array} extractedFields - Fields from PDF parser
   * @returns {Object} - Mapped profile data
   */
  mapFields(extractedFields) {
    const mapped = {};
    const fieldPatterns = {};
    const unmapped = [];

    for (const field of extractedFields) {
      const fieldName = field.name.trim();
      const value = (field.value || '').trim();

      if (!fieldName || !value) continue;

      // Try to find matching field in mappings
      let matched = false;

      for (const [profileField, pdfNames] of Object.entries(this.fieldMappings)) {
        for (const pdfName of pdfNames) {
          if (this.compareFieldNames(fieldName, pdfName)) {
            mapped[profileField] = value;
            fieldPatterns[profileField] = this.buildRegexFromAliases(pdfNames);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }

      if (!matched) {
        unmapped.push({ name: fieldName, value: value });
      }
    }

    return {
      mapped: mapped,
      fieldPatterns: fieldPatterns,
      unmapped: unmapped,
      totalExtracted: extractedFields.length,
      matchedCount: Object.keys(mapped).length
    };
  }

  /**
   * Compare field names intelligently
   */
  compareFieldNames(fieldName1, fieldName2) {
    const normalize = (str) => {
      return str.toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ')     // Normalize spaces
        .trim();
    };

    const norm1 = normalize(fieldName1);
    const norm2 = normalize(fieldName2);

    // Exact match
    if (norm1 === norm2) return true;

    // Partial match (at least 70% similar)
    const similarity = this.stringSimilarity(norm1, norm2);
    return similarity > 0.7;
  }

  /**
   * Calculate string similarity (0-1)
   */
  stringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Create profile from mapped fields
   */
  createProfile(mappedData) {
    const applicantName = mappedData.mapped.applicantName || "Imported Profile";
    const profile = {
      id: this.generateId(),
      name: `${applicantName} (Teletalk)`,
      color: '#147a6c',
      fields: this.convertMappedToFields(mappedData),
      urlRules: [
        {
          type: "contains",
          pattern: "teletalk.com.bd",
          includePath: false,
          enabled: true,
        },
      ],
      defaultMode: 'overwrite',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      source: 'pdf_import'
    };

    return profile;
  }

  /**
   * Convert mapped fields to extension field format
   */
  convertMappedToFields(mappedData) {
    const fields = [];
    const { mapped, fieldPatterns, unmapped } = mappedData;

    // Add mapped fields
    for (const [key, value] of Object.entries(mapped)) {
      fields.push({
        type: 'text',
        name: fieldPatterns[key] || this.escapeForRegex(key),
        value: value,
        mode: 'overwrite'
      });
    }

    // Add unmapped fields as-is
    for (const { name, value } of unmapped) {
      fields.push({
        type: 'text',
        name: this.buildFlexibleFieldPattern(name),
        value: value,
        mode: 'overwrite'
      });
    }

    return fields;
  }

  buildRegexFromAliases(aliases) {
    const cleanedAliases = aliases
      .map((alias) => alias && alias.trim())
      .filter(Boolean);

    if (cleanedAliases.length === 0) {
      return "";
    }

    const parts = cleanedAliases.map((alias) => {
      return this.escapeForRegex(alias).replace(/\s+/g, "[-_\\s]*");
    });

    return `(?:${parts.join("|")})`;
  }

  buildFlexibleFieldPattern(fieldName) {
    const normalized = fieldName.trim();
    if (!normalized) {
      return "";
    }

    return this.escapeForRegex(normalized).replace(/\s+/g, "[-_\\s]*");
  }

  escapeForRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Generate unique ID for profile
   */
  generateId() {
    return 'profile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

// Create global instance
const teleTalkMapper = new TeleTalkMapper();
