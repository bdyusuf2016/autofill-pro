// TeleTalk Field Mapper
// Maps extracted PDF field labels to actual Teletalk form properties.

class TeleTalkMapper {
  constructor() {
    this.fieldMappings = this.buildFieldMappings();
  }

  buildFieldMappings() {
    return {
      name: ["Applicant's Name", "Applicant Name", "Full Name", "Name", "name"],
      name_bn: ["আবেদনকারীর নাম (বাংলায়)", "Bangla Name", "name_bn"],
      father: ["Father's Name", "Father Name", "father"],
      father_bn: ["পিতার নাম (বাংলায়)", "পিতার নাম", "father_bn"],
      mother: ["Mother's Name", "Mother Name", "mother"],
      mother_bn: ["মাতার নাম (বাংলায়)", "মাতার নাম", "mother_bn"],
      dob: ["Date of Birth", "DOB", "Birth Date", "dob"],
      nationality: ["Nationality", "nationality"],
      religion: ["Religion", "religion"],
      gender: ["Gender", "Sex", "gender"],
      email: ["Email", "Email Address", "E-mail", "email"],
      mobile: [
        "Phone",
        "Phone Number",
        "Mobile",
        "Mobile Number",
        "Contact Number",
        "mobile",
      ],
      confirm_mobile: [
        "Confirm Mobile Number",
        "Re-enter Mobile",
        "confirm_mobile",
      ],
      spouse_name: ["Spouse Name", "spouse_name"],
      nid_no: [
        "National ID",
        "NID",
        "NID Number",
        "National ID Number",
        "nid_no",
      ],
      breg_no: [
        "Birth Registration",
        "Birth Registration Number",
        "breg_no",
      ],
      passport_no: ["Passport ID", "Passport Number", "passport_no"],
      marital_status: ["Marital Status", "marital_status"],
      quota: ["Quota", "quota"],
      quota_details: [
        "Quota Details",
        "Freedom Fighter Details",
        "quota_details",
      ],
      dep_status: ["Departmental Status", "dep_status"],
      present_careof: ["Present Care Of", "Care Of", "present_careof"],
      present_village: [
        "Present Village",
        "Village/ Road/ House/ Flat",
        "present_village",
      ],
      present_district: ["Present District", "present_district"],
      present_upazila: ["Present Upazila", "Upazila/P.S.", "present_upazila"],
      present_post: ["Present Post Office", "present_post"],
      present_postcode: ["Present Post Code", "present_postcode"],
      permanent_careof: ["Permanent Care Of", "permanent_careof"],
      permanent_village: ["Permanent Village", "permanent_village"],
      permanent_district: ["Permanent District", "permanent_district"],
      permanent_upazila: ["Permanent Upazila", "permanent_upazila"],
      permanent_post: ["Permanent Post Office", "permanent_post"],
      permanent_postcode: ["Permanent Post Code", "permanent_postcode"],
      ssc_exam: ["SSC Examination", "ssc_exam"],
      ssc_roll: ["SSC Roll No", "SSC Roll", "ssc_roll"],
      ssc_group: ["SSC Group", "SSC Subject", "ssc_group"],
      ssc_board: ["SSC Board", "ssc_board"],
      ssc_result_type: ["SSC Result Type", "ssc_result_type"],
      ssc_result: ["SSC GPA", "SSC Result", "ssc_result"],
      ssc_year: ["SSC Passing Year", "ssc_year"],
      hsc_exam: ["HSC Examination", "hsc_exam"],
      hsc_roll: ["HSC Roll No", "HSC Roll", "hsc_roll"],
      hsc_group: ["HSC Group", "HSC Subject", "hsc_group"],
      hsc_board: ["HSC Board", "hsc_board"],
      hsc_result_type: ["HSC Result Type", "hsc_result_type"],
      hsc_result: ["HSC GPA", "HSC Result", "hsc_result"],
      hsc_year: ["HSC Passing Year", "hsc_year"],
      gra_exam: ["Graduation Examination", "gra_exam"],
      gra_institute: ["University/Inst.", "Institute", "gra_institute"],
      gra_year: ["Graduation Passing Year", "gra_year"],
      gra_subject: ["Subject/Degree", "gra_subject"],
      gra_result_type: ["Graduation Result Type", "gra_result_type"],
      gra_result: ["Graduation GPA", "gra_result"],
      gra_duration: ["Course Duration", "gra_duration"],
      "job[0][employment_type]": [
        "Employed on",
        "Employment Type",
        "job[0][employment_type]",
      ],
      "job[0][designation]": [
        "Designation/Post",
        "Designation",
        "job[0][designation]",
      ],
      "job[0][job_start_date]": [
        "Job Start Date",
        "Length of Service From",
        "job[0][job_start_date]",
      ],
      "job[0][job_end_date]": [
        "Job End Date",
        "Length of Service To",
        "job[0][job_end_date]",
      ],
      "job[0][organization]": ["Organization", "job[0][organization]"],
      "job[0][office_address]": [
        "Office Address",
        "Job Address",
        "job[0][office_address]",
      ],
      "job[0][last_salary]": [
        "Last Drawn Salary",
        "job[0][last_salary]",
      ],
      "job[0][job_description]": [
        "Job Description",
        "job[0][job_description]",
      ],
      captcha: ["Captcha", "captcha"],
    };
  }

  mapFields(extractedFields) {
    const mapped = {};
    const fieldPatterns = {};
    const unmapped = [];

    for (const field of extractedFields) {
      const fieldName = field.name.trim();
      const value = (field.value || "").trim();

      if (!fieldName || !value) {
        continue;
      }

      let matched = false;

      for (const [profileField, aliases] of Object.entries(this.fieldMappings)) {
        for (const alias of aliases) {
          if (this.compareFieldNames(fieldName, alias)) {
            mapped[profileField] = value;
            fieldPatterns[profileField] = this.buildRegexFromAliases(aliases);
            matched = true;
            break;
          }
        }

        if (matched) {
          break;
        }
      }

      if (!matched) {
        unmapped.push({ name: fieldName, value });
      }
    }

    return {
      mapped,
      fieldPatterns,
      unmapped,
      totalExtracted: extractedFields.length,
      matchedCount: Object.keys(mapped).length,
    };
  }

  compareFieldNames(fieldName1, fieldName2) {
    const normalize = (str) =>
      String(str)
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s_]/gu, "")
        .replace(/\s+/g, " ")
        .trim();

    const norm1 = normalize(fieldName1);
    const norm2 = normalize(fieldName2);

    if (!norm1 || !norm2) {
      return false;
    }

    if (norm1 === norm2) {
      return true;
    }

    return this.stringSimilarity(norm1, norm2) > 0.7;
  }

  stringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

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

  createProfile(mappedData) {
    this.applyTeletalkDerivedFields(mappedData);

    const applicantName =
      mappedData.mapped.name || mappedData.mapped.applicantName || "Imported Profile";

    return {
      id: this.generateId(),
      name: `${applicantName} (Teletalk)`,
      color: "#147a6c",
      fields: this.convertMappedToFields(mappedData),
      urlRules: [
        {
          type: "contains",
          pattern: "teletalk.com.bd",
          includePath: false,
          enabled: true,
        },
      ],
      defaultMode: "overwrite",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      source: "pdf_import",
    };
  }

  createTemplateProfile(propertyDefinitions, profileName = "Teletalk Template") {
    const fields = (propertyDefinitions || []).map((field) => ({
      type: this.mapInputTypeToProfileType(field.type),
      name: this.buildExactPropertyPattern(field.name),
      value: "",
      mode: "overwrite",
    }));

    return {
      id: this.generateId(),
      name: profileName,
      color: "#147a6c",
      fields,
      urlRules: [
        {
          type: "contains",
          pattern: "teletalk.com.bd",
          includePath: false,
          enabled: true,
        },
      ],
      defaultMode: "overwrite",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      source: "teletalk_template",
    };
  }

  applyTeletalkDerivedFields(mappedData) {
    if (!mappedData || !mappedData.mapped || !mappedData.fieldPatterns) {
      return;
    }

    if (mappedData.mapped.mobile && !mappedData.mapped.confirm_mobile) {
      mappedData.mapped.confirm_mobile = mappedData.mapped.mobile;
      mappedData.fieldPatterns.confirm_mobile = this.buildRegexFromAliases(
        this.fieldMappings.confirm_mobile || ["confirm_mobile"]
      );
    }
  }

  convertMappedToFields(mappedData) {
    const fields = [];
    const { mapped, fieldPatterns, unmapped } = mappedData;

    for (const [key, value] of Object.entries(mapped)) {
      if (!value) {
        continue;
      }

      fields.push({
        type: "text",
        name: fieldPatterns[key] || this.buildFlexibleFieldPattern(key),
        value,
        mode: "overwrite",
      });
    }

    for (const { name, value } of unmapped) {
      fields.push({
        type: "text",
        name: this.buildFlexibleFieldPattern(name),
        value,
        mode: "overwrite",
      });
    }

    return fields;
  }

  buildRegexFromAliases(aliases) {
    const cleanedAliases = aliases.map((alias) => alias && alias.trim()).filter(Boolean);
    const parts = cleanedAliases.map((alias) =>
      this.escapeForRegex(alias).replace(/\s+/g, "[-_\\s]*")
    );

    return parts.length > 0 ? `(?:${parts.join("|")})` : "";
  }

  buildFlexibleFieldPattern(fieldName) {
    const normalized = String(fieldName || "").trim();
    if (!normalized) {
      return "";
    }

    return this.escapeForRegex(normalized).replace(/\s+/g, "[-_\\s]*");
  }

  buildExactPropertyPattern(fieldName) {
    return `^${this.escapeForRegex(String(fieldName || "").trim())}$`;
  }

  mapInputTypeToProfileType(inputType) {
    switch (inputType) {
      case "select":
        return "select";
      case "textarea":
        return "textarea";
      case "date":
        return "date";
      case "email":
        return "email";
      case "tel":
        return "tel";
      case "number":
        return "number";
      default:
        return "text";
    }
  }

  escapeForRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  generateId() {
    return `profile_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

const teleTalkMapper = new TeleTalkMapper();
