/** بدون https:// يصير الطلب نسبي لنفس استضافة الواجهة → غالباً 404 */
const BASE_URL = String(CONFIG.BASE_URL || "").replace(/\/+$/, "");
const BASE_URL_OK = /^https?:\/\//i.test(BASE_URL);
if (!BASE_URL_OK) {
  console.error(
    "[api] عيّني CONFIG.BASE_URL في core/config.js إلى رابط السيرفر كاملاً (مثل https://….ngrok-free.dev)."
  );
}
const HEADERS = {
  Authorization: `Bearer ${CONFIG.API_TOKEN}`,
  "ngrok-skip-browser-warning": "true",
};

const FETCH_INIT = Object.freeze({
  cache: "no-store",
  credentials: "omit",
  mode: "cors",
});

// Register new company
async function registerCompany(formData) {
  try {
    const res = await fetch(`${BASE_URL}/company/send`, {
      method: "POST",
      headers: { ...HEADERS },
      body: formData,
      ...FETCH_INIT,
    }).catch(function (err) {
      console.warn("registerCompany fetch failed", err);
      return null;
    });
    if (!res) {
      return { success: false, networkError: true };
    }
    try {
      return await res.json();
    } catch (e) {
      return {};
    }
  } catch (e) {
    return {
      success: false,
      networkError: true,
      error: e && e.name,
    };
  }
}

/**
 * جلب شركة بالجهاز — GET /company/:device_uid/getCompanyDevice
 * نفس مسار checkDevice؛ اسم أوضح للصفحات التي تعرض بيانات وليس فقط «فحص».
 */
async function getCompanyDevice(device_uid) {
  return checkDevice(device_uid);
}

// Check if device is recognized — returns HTTP meta + parsed JSON body
async function checkDevice(device_uid) {
  try {
    const res = await fetch(
      `${BASE_URL}/company/${device_uid}/getCompanyDevice`,
      {
        method: "GET",
        headers: { ...HEADERS },
        ...FETCH_INIT,
      }
    ).catch(function (err) {
      console.warn("checkDevice fetch failed", err);
      return null;
    });
    if (!res) {
      return { ok: false, status: 0, body: null };
    }
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = null;
    }
    return {
      ok: res.ok,
      status: res.status,
      body,
    };
  } catch (e) {
    return { ok: false, status: 0, body: null };
  }
}

/** GET فقط — الباكند يرفض POST على هذا المسار (404). */
async function verifyLogin(user_id, pass) {
  const id = String(user_id ?? "").trim();
  if (!id || !BASE_URL_OK) {
    return { networkError: true };
  }
  try {
    const q = encodeURIComponent(String(pass ?? ""));
    const res = await fetch(
      `${BASE_URL}/company/${encodeURIComponent(id)}/getCompanyUserId?pass=${q}`,
      {
        method: "GET",
        headers: { ...HEADERS },
        ...FETCH_INIT,
      }
    ).catch(function (err) {
      console.warn("verifyLogin fetch failed", err);
      return null;
    });
    if (!res) {
      return { networkError: true };
    }
    try {
      return await res.json();
    } catch (e) {
      return {};
    }
  } catch (e) {
    return { networkError: true, error: e && e.name };
  }
}

// Update device UID after login
async function updateDevice(user_id, newDevice) {
  try {
    const res = await fetch(
      `${BASE_URL}/company/${encodeURIComponent(String(user_id))}/updateNewDevice`,
      {
        method: "PATCH",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ newDevice }),
        ...FETCH_INIT,
      }
    ).catch(function (err) {
      console.warn("updateDevice fetch failed", err);
      return null;
    });
    if (!res) {
      return { success: false, networkError: true };
    }
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = null;
    }
    if (body != null) return body;
    if (!res.ok) {
      return { success: false, networkError: true, status: res.status };
    }
    return { success: true };
  } catch (e) {
    return { success: false, networkError: true, error: e && e.name };
  }
}

/** PATCH /company/:user_id/updateCompanyInfo — multipart */
async function updateCompany(user_id, formData) {
  try {
    const res = await fetch(
      `${BASE_URL}/company/${encodeURIComponent(String(user_id))}/updateCompanyInfo`,
      {
        method: "PATCH",
        headers: { ...HEADERS },
        body: formData,
        ...FETCH_INIT,
      }
    ).catch(function (err) {
      console.warn("updateCompany fetch failed", err);
      return null;
    });
    if (!res) {
      return {
        ok: false,
        status: 0,
        body: { success: false, networkError: true },
      };
    }
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = null;
    }
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return {
      ok: false,
      status: 0,
      body: { success: false, networkError: true, error: e && e.name },
    };
  }
}

/** GET /road/:road_userId/3/getRoadUserId — الرقم 3 ثابت حسب الباكند */
async function getRoadEvents(road_userId) {
  try {
    const uid = Number(road_userId);
    const res = await fetch(`${BASE_URL}/road/${uid}/3/getRoadUserId`, {
      method: "GET",
      headers: { ...HEADERS },
      ...FETCH_INIT,
    }).catch(function (err) {
      console.warn("getRoadEvents fetch failed", err);
      return null;
    });
    if (!res) {
      return { ok: false, status: 0, body: null };
    }
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = null;
    }
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: null };
  }
}

/** POST /road/send */
async function sendRoadEvent(payload) {
  try {
    const res = await fetch(`${BASE_URL}/road/send`, {
      method: "POST",
      headers: { ...HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      ...FETCH_INIT,
    }).catch(function (err) {
      console.warn("sendRoadEvent fetch failed", err);
      return null;
    });
    if (!res) {
      return { ok: false, status: 0, body: { networkError: true } };
    }
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = null;
    }
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: { networkError: true, error: e && e.name } };
  }
}

/** PATCH /road/:userId/updateStartEnd */
async function updateRoadStartEnd(userId, startEnd) {
  try {
    const res = await fetch(
      `${BASE_URL}/road/${encodeURIComponent(String(userId))}/updateStartEnd`,
      {
        method: "PATCH",
        headers: { ...HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ startEnd: Number(startEnd) }),
        ...FETCH_INIT,
      }
    ).catch(function (err) {
      console.warn("updateRoadStartEnd fetch failed", err);
      return null;
    });
    if (!res) {
      return { ok: false, status: 0, body: { networkError: true } };
    }
    let body = null;
    try {
      body = await res.json();
    } catch (e) {
      body = null;
    }
    return { ok: res.ok, status: res.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: { networkError: true, error: e && e.name } };
  }
}

/** GET /company_product/:company_id/getCompanyProduct — معرف الشركة */
async function getCompanyProducts(company_id) {
  try {
    const cid = encodeURIComponent(String(company_id));
    const res = await fetch(
      `${BASE_URL}/company_product/${cid}/getCompanyProduct`,
      {
        method: "GET",
        headers: { ...HEADERS },
        ...FETCH_INIT,
      }
    ).catch(function (err) {
      console.warn("getCompanyProducts fetch failed", err);
      return null;
    });
    if (!res) return [];
    try {
      return await res.json();
    } catch (e) {
      return [];
    }
  } catch (e) {
    return [];
  }
}

/** POST /company_product/send — multipart FormData */
async function sendProduct(formData) {
  try {
    const res = await fetch(`${BASE_URL}/company_product/send`, {
      method: "POST",
      headers: { ...HEADERS },
      body: formData,
      ...FETCH_INIT,
    }).catch(function (err) {
      console.warn("sendProduct fetch failed", err);
      return null;
    });
    if (!res) return { ok: false, success: false };
    let data = {};
    try {
      data = await res.json();
    } catch (e) {
      data = {};
    }
    const payload =
      data != null && typeof data === "object" && !Array.isArray(data) ? data : {};
    const failed =
      !res.ok ||
      payload.success === false ||
      payload.success === 0 ||
      String(payload.success).toLowerCase() === "false";
    return {
      ...payload,
      ok: res.ok,
      status: res.status,
      success: !failed,
    };
  } catch (e) {
    return { ok: false, success: false };
  }
}

/** PATCH /company_product/:product_id/updateProduct — multipart (نفس حقول الإنشاء؛ الصور اختيارية إن وُجدت ملفات جديدة) */
async function updateProduct(product_id, formData) {
  try {
    const pid = encodeURIComponent(String(product_id));
    const res = await fetch(
      `${BASE_URL}/company_product/${pid}/updateProduct`,
      {
        method: "PATCH",
        headers: { ...HEADERS },
        body: formData,
        ...FETCH_INIT,
      }
    ).catch(function (err) {
      console.warn("updateProduct fetch failed", err);
      return null;
    });
    if (!res) return { success: false };
    try {
      return await res.json();
    } catch (e) {
      return { success: res.ok };
    }
  } catch (e) {
    return { success: false };
  }
}


async function deleteProduct(user_id) {
  try {
    const uid = encodeURIComponent(String(user_id).trim());
    const res = await fetch(
      `${BASE_URL}/company_product/${uid}/deleteProduct`,
      {
        method: "DELETE",
        headers: { ...HEADERS },
        ...FETCH_INIT,
      }
    ).catch(function (err) {
      console.warn("deleteProduct fetch failed", err);
      return null;
    });
    if (!res) return { ok: false, success: false };
    let data = {};
    try {
      data = await res.json();
    } catch (e) {

      data = {};
    }
    const payload =
      data != null && typeof data === "object" && !Array.isArray(data) ? data : {};

    function explicitDeleteFailure(p) {
      if (!p || typeof p !== "object") return false;
      if (p.success === false || p.success === 0) return true;
      if (String(p.success).toLowerCase() === "false") return true;
      const err = p.error;
      if (err === undefined || err === null || err === false) return false;
      if (typeof err === "number") return err !== 0;
      if (typeof err === "string" && err.trim() === "") return false;
      return true;
    }

    const failed = !res.ok || explicitDeleteFailure(payload);
    const out = {
      ...payload,
      ok: res.ok,
      status: res.status,
      success: !failed,
    };
    if (res.status === 404) {
      out.message =
        payload.message ||
        out.message ||
        "مسار الحذف غير موجود (404). تأكدي من تفعيل DELETE /company_product/:user_id/deleteProduct في الباكند.";
    }
    return out;
  } catch (e) {
    return { ok: false, success: false };
  }
}

/** GET /users_road/:userId/getUsersRoad — قائمة المشاركين للفعالية */
async function getEventParticipants(userId) {
  try {
    const uid = encodeURIComponent(String(userId));
    const res = await fetch(`${BASE_URL}/users_road/${uid}/getUsersRoad`, {
      method: "GET",
      headers: { ...HEADERS },
      ...FETCH_INIT,
    }).catch(function (err) {
      console.warn("getEventParticipants fetch failed", err);
      return null;
    });
    if (!res) return [];
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
    return Array.isArray(data) ? data : [];
  } catch (e) {
    return [];
  }
}

function resolveImageUrl(imageUrl) {
  if (!imageUrl) return "";
  var s = String(imageUrl).trim();
  if (!s) return "";
  if (!BASE_URL_OK) return s;
  /* روابط كاملة من الباكند المحلي → أصل الـ API المعروف في CONFIG */
  if (/^https?:\/\//i.test(s)) {
    return s
      .replace(/^http:\/\/localhost(?::\d+)?/gi, BASE_URL)
      .replace(/^http:\/\/127\.0\.0\.1(?::\d+)?/gi, BASE_URL);
  }
  /* مسار نسبي من الجذر مثل /uploadStore/... — بدون BASE_URL يُحمَّل من استضافة الواجهة فيختفي */
  if (s.charAt(0) === "/") {
    return BASE_URL + s;
  }
  /* روابط بلا بروتوكول */
  if (s.indexOf("//") === 0) {
    try {
      var origin = new URL(BASE_URL);
      return origin.protocol + s;
    } catch (e) {
      return s;
    }
  }
  return s;
}

window.resolveImageUrl = resolveImageUrl;
window.registerCompany = registerCompany;
window.getCompanyDevice = getCompanyDevice;
window.checkDevice = checkDevice;
window.verifyLogin = verifyLogin;
window.updateDevice = updateDevice;
window.updateCompany = updateCompany;
window.getRoadEvents = getRoadEvents;
window.sendRoadEvent = sendRoadEvent;
window.updateRoadStartEnd = updateRoadStartEnd;
window.getEventParticipants = getEventParticipants;
window.getCompanyProducts = getCompanyProducts;
window.sendProduct = sendProduct;
window.updateProduct = updateProduct;
window.deleteProduct = deleteProduct;
