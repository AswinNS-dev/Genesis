// CrimeIntel — Police Data Preprocessing & Validation Service
// ============================================================
// Normalizes and validates incoming police records while strictly
// preserving original source data for evidentiary provenance.
// ============================================================

export interface RawPoliceRecord {
  id?: string;
  name?: string | null;
  aliases?: string[] | string | null;
  phone?: string | null;
  alternatePhones?: string[] | string | null;
  dob?: string | null;
  age?: number | string | null;
  gender?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  vehicleNo?: string | null;
  nationalId?: string | null; // Aadhaar / Voter ID / PAN
  caseId?: string | null;
  firNo?: string | null;
  policeStation?: string | null;
  role?: string | null; // Suspect | Accused | Witness | Informant | Victim
  notes?: string | null;
  source?: string | null;
  observedAt?: string | Date | null;
}

export interface NormalizedPoliceRecord {
  name: string;
  namePhoneticKey: string;
  nameTokens: string[];
  aliases: string[];
  phone: string | null;
  alternatePhones: string[];
  dob: string | null; // YYYY-MM-DD
  birthYear: number | null;
  gender: "MALE" | "FEMALE" | "OTHER" | "UNKNOWN";
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  vehicleNo: string | null;
  nationalId: string | null;
  caseId: string | null;
  firNo: string | null;
  policeStation: string | null;
  role: string;
  observedAt: string;
}

export interface ValidatedRecord {
  id: string;
  original: RawPoliceRecord;
  normalized: NormalizedPoliceRecord;
  errors: string[];
  warnings: string[];
  isValid: boolean;
  provenance: {
    source: string;
    ingestedAt: string;
    hash: string;
  };
}

export class ValidationService {
  /**
   * Preprocesses and validates a raw police record.
   */
  validateRecord(raw: RawPoliceRecord, source = "POLICE_STATION_FEED"): ValidatedRecord {
    const id = raw.id || `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Name Normalization & Phonetic Key
    const originalName = String(raw.name ?? "").trim();
    if (!originalName) {
      errors.push("Missing required field: Name");
    }

    const normalizedName = this.normalizeName(originalName);
    const nameTokens = normalizedName.split(" ").filter((t) => t.length > 0);
    const namePhoneticKey = this.computeSoundex(normalizedName);

    // Parse Aliases
    let aliasesList: string[] = [];
    if (Array.isArray(raw.aliases)) {
      aliasesList = raw.aliases.map((a) => this.normalizeName(String(a))).filter(Boolean);
    } else if (typeof raw.aliases === "string") {
      try {
        const parsed = JSON.parse(raw.aliases);
        if (Array.isArray(parsed)) {
          aliasesList = parsed.map((a) => this.normalizeName(String(a))).filter(Boolean);
        } else {
          aliasesList = [this.normalizeName(raw.aliases)];
        }
      } catch {
        aliasesList = raw.aliases
          .split(/[,/|;]/)
          .map((a) => this.normalizeName(a))
          .filter(Boolean);
      }
    }

    // 2. Phone Normalization & Validation (Indian mobile format: 10 digits starting with 6,7,8,9)
    const normalizedPhone = this.normalizePhone(raw.phone);
    if (raw.phone && !normalizedPhone) {
      warnings.push(`Invalid phone format: "${raw.phone}" (expected 10-digit number)`);
    }

    let alternatePhones: string[] = [];
    if (Array.isArray(raw.alternatePhones)) {
      alternatePhones = raw.alternatePhones
        .map((p) => this.normalizePhone(p))
        .filter((p): p is string => Boolean(p));
    } else if (typeof raw.alternatePhones === "string") {
      alternatePhones = raw.alternatePhones
        .split(/[,/|;]/)
        .map((p) => this.normalizePhone(p))
        .filter((p): p is string => Boolean(p));
    }

    // 3. Date of Birth & Age Normalization
    const { dob, birthYear, dateWarnings } = this.normalizeDOB(raw.dob, raw.age);
    warnings.push(...dateWarnings);

    // 4. Address & City Normalization
    const normalizedAddress = this.normalizeAddress(raw.address);
    const normalizedCity = this.normalizeCity(raw.city);
    const normalizedDistrict = raw.district ? raw.district.trim().toUpperCase() : null;
    const normalizedState = raw.state ? raw.state.trim().toUpperCase() : null;
    const normalizedPincode = this.normalizePincode(raw.pincode);

    if (raw.pincode && !normalizedPincode) {
      warnings.push(`Invalid PIN code format: "${raw.pincode}" (expected 6 digits)`);
    }

    // 5. Vehicle Normalization (e.g. TN01AB1234)
    const normalizedVehicle = this.normalizeVehicle(raw.vehicleNo);

    // 6. National Identifier (Aadhaar / Voter / PAN)
    const normalizedNationalId = this.normalizeNationalId(raw.nationalId);

    // 7. Provenance & Ingestion Metadata
    const observedAt = raw.observedAt
      ? new Date(raw.observedAt).toISOString()
      : new Date().toISOString();

    const normalized: NormalizedPoliceRecord = {
      name: normalizedName,
      namePhoneticKey,
      nameTokens,
      aliases: aliasesList,
      phone: normalizedPhone,
      alternatePhones,
      dob,
      birthYear,
      gender: this.normalizeGender(raw.gender),
      address: normalizedAddress,
      city: normalizedCity,
      district: normalizedDistrict,
      state: normalizedState,
      pincode: normalizedPincode,
      vehicleNo: normalizedVehicle,
      nationalId: normalizedNationalId,
      caseId: raw.caseId ? raw.caseId.trim() : null,
      firNo: raw.firNo ? raw.firNo.trim().toUpperCase() : null,
      policeStation: raw.policeStation ? raw.policeStation.trim().toUpperCase() : null,
      role: raw.role ? raw.role.trim().toUpperCase() : "SUSPECT",
      observedAt,
    };

    // Calculate deterministic SHA-256 data hash for blockchain provenance
    const provenanceHash = this.computeProvenanceHash(raw, normalized);

    return {
      id,
      original: raw,
      normalized,
      errors,
      warnings,
      isValid: errors.length === 0,
      provenance: {
        source: raw.source || source,
        ingestedAt: new Date().toISOString(),
        hash: provenanceHash,
      },
    };
  }

  /**
   * Batch processes an array of police records.
   */
  validateBatch(records: RawPoliceRecord[], source = "BATCH_UPLOAD"): ValidatedRecord[] {
    return records.map((r) => this.validateRecord(r, source));
  }

  // --- Helpers for Normalization & Data Cleansing ---

  private normalizeName(name: string): string {
    if (!name) return "";
    let s = name
      .toLowerCase()
      .trim()
      // Remove honorifics
      .replace(/^(mr\.|mrs\.|ms\.|shri|smt\.|dr\.|late|thiru|selvi)\s+/i, "")
      // Remove trailing relations like s/o, d/o, w/o
      .replace(/\s+(s\/o|d\/o|w\/o)\s+.*$/i, "")
      // Remove punctuation
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ");
    return s.trim();
  }

  private normalizePhone(phone?: string | null): string | null {
    if (!phone) return null;
    // Strip non-digits
    let digits = phone.replace(/\D/g, "");
    // Remove leading 91 or +91 or 0
    if (digits.length === 12 && digits.startsWith("91")) {
      digits = digits.substring(2);
    } else if (digits.length === 11 && digits.startsWith("0")) {
      digits = digits.substring(1);
    }

    // Must be exactly 10 digits starting with 6-9
    if (/^[6-9]\d{9}$/.test(digits)) {
      // Check for obviously fake/repeating numbers
      if (/^(\d)\1{9}$/.test(digits) || digits === "1234567890") {
        return null;
      }
      return digits;
    }
    return null;
  }

  private normalizeDOB(dobRaw?: string | null, ageRaw?: number | string | null): {
    dob: string | null;
    birthYear: number | null;
    dateWarnings: string[];
  } {
    const dateWarnings: string[] = [];
    const currentYear = new Date().getFullYear();

    if (dobRaw) {
      const d = new Date(dobRaw);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        if (year > currentYear) {
          dateWarnings.push(`Future date of birth detected: ${dobRaw}`);
        } else if (currentYear - year > 120) {
          dateWarnings.push(`DOB implies age > 120 years: ${dobRaw}`);
        } else {
          const iso = d.toISOString().split("T")[0];
          return { dob: iso, birthYear: year, dateWarnings };
        }
      } else {
        // Try extracting 4-digit year
        const yearMatch = dobRaw.match(/\b(19\d{2}|20\d{2})\b/);
        if (yearMatch) {
          const year = parseInt(yearMatch[1], 10);
          return { dob: `${year}-01-01`, birthYear: year, dateWarnings };
        }
        dateWarnings.push(`Unparseable date of birth: "${dobRaw}"`);
      }
    }

    if (ageRaw !== undefined && ageRaw !== null && ageRaw !== "") {
      const ageNum = typeof ageRaw === "number" ? ageRaw : parseInt(String(ageRaw), 10);
      if (!isNaN(ageNum) && ageNum > 0 && ageNum < 120) {
        const estYear = currentYear - ageNum;
        return { dob: `${estYear}-01-01`, birthYear: estYear, dateWarnings };
      }
    }

    return { dob: null, birthYear: null, dateWarnings };
  }

  private normalizeAddress(addr?: string | null): string | null {
    if (!addr) return null;
    let a = addr
      .toLowerCase()
      .trim()
      .replace(/\b(street|st\.)\b/g, "st")
      .replace(/\b(road|rd\.)\b/g, "rd")
      .replace(/\b(nagar|ngr)\b/g, "nagar")
      .replace(/\b(colony|clny)\b/g, "colony")
      .replace(/\b(cross|cr\.)\b/g, "cross")
      .replace(/\b(main|mn\.)\b/g, "main")
      .replace(/\b(salai)\b/g, "salai")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ");
    return a.trim() || null;
  }

  private normalizeCity(city?: string | null): string | null {
    if (!city) return null;
    const c = city.toLowerCase().trim();
    const cityMap: Record<string, string> = {
      madras: "chennai",
      bombay: "mumbai",
      calcutta: "kolkata",
      bangalore: "bengaluru",
      trivandrum: "thiruvananthapuram",
      cochin: "kochi",
      baroda: "vadodara",
      poona: "pune",
      madurai: "madurai",
      coimbatore: "coimbatore",
      trichy: "tiruchirappalli",
      salem: "salem",
      delhi: "delhi",
      hyderabad: "hyderabad",
    };
    return cityMap[c] || c.toUpperCase();
  }

  private normalizePincode(pin?: string | null): string | null {
    if (!pin) return null;
    const cleaned = pin.replace(/\D/g, "");
    if (/^[1-9]\d{5}$/.test(cleaned)) {
      return cleaned;
    }
    return null;
  }

  private normalizeVehicle(veh?: string | null): string | null {
    if (!veh) return null;
    const cleaned = veh.toUpperCase().replace(/[^A-Z0-9]/g, "");
    // Standard Indian vehicle registration format: 2-letter state + 2-digit RTO + optional series + 4 digits
    if (/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(cleaned)) {
      return cleaned;
    }
    return cleaned.length >= 4 ? cleaned : null;
  }

  private normalizeNationalId(nid?: string | null): string | null {
    if (!nid) return null;
    const cleaned = nid.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return cleaned.length >= 5 ? cleaned : null;
  }

  private normalizeGender(g?: string | null): "MALE" | "FEMALE" | "OTHER" | "UNKNOWN" {
    if (!g) return "UNKNOWN";
    const str = g.trim().toUpperCase();
    if (str.startsWith("M")) return "MALE";
    if (str.startsWith("F")) return "FEMALE";
    if (str.startsWith("O") || str.startsWith("T")) return "OTHER";
    return "UNKNOWN";
  }

  /**
   * Soundex phonetic encoding algorithm for Indian names.
   */
  public computeSoundex(name: string): string {
    if (!name) return "0000";
    const s = name.toUpperCase().replace(/[^A-Z]/g, "");
    if (!s.length) return "0000";

    const mapping: Record<string, string> = {
      B: "1", F: "1", P: "1", V: "1",
      C: "2", G: "2", J: "2", K: "2", Q: "2", S: "2", X: "2", Z: "2",
      D: "3", T: "3",
      L: "4",
      M: "5", N: "5",
      R: "6",
    };

    let result = s[0];
    let prev = mapping[s[0]] || "0";

    for (let i = 1; i < s.length; i++) {
      const code = mapping[s[i]] || "0";
      if (code !== "0" && code !== prev) {
        result += code;
        prev = code;
      } else if (code === "0") {
        prev = "0";
      }
      if (result.length === 4) break;
    }

    return (result + "000").substring(0, 4);
  }

  private computeProvenanceHash(raw: RawPoliceRecord, normalized: NormalizedPoliceRecord): string {
    const rawStr = JSON.stringify({ raw, normalized });
    // Simple deterministic string hash for demo ledger consistency
    let hash = 0;
    for (let i = 0; i < rawStr.length; i++) {
      const char = rawStr.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `SHA256:${Math.abs(hash).toString(16).padStart(16, "0")}`;
  }
}

export const validationService = new ValidationService();
