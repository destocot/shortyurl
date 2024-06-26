"use server";
import dbConnect from "@/lib/dbConnect";
import Url from "@/models/Url";
import normalizeUrl from "normalize-url";

export async function createShortUrl(input: string, token: string | null) {
  try {
    const res = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${token}`,
      { method: "POST" }
    );
    const json = await res.json();

    if (!json.success) return { error: "reCAPTCHA failed" };

    const url = normalizeUrl(input);
    const urlWithHttp = normalizeUrl(url, { forceHttp: true });
    const urlWithHttps = normalizeUrl(url, { forceHttps: true });

    await dbConnect();

    const exists = await Url.findOne({
      $or: [{ url: urlWithHttp }, { url: urlWithHttps }],
    });
    if (exists) {
      deleteOldUrls();
      return { data: exists.hash };
    }

    const hash = Math.random().toString(36).substring(7);
    const result = await Url.create({ url, hash });

    deleteOldUrls();
    return { data: result.hash };
  } catch (e) {
    if (e instanceof Error) {
      return { error: e.message };
    }
    return { error: "Oops, something went wrong" };
  }
}

/**
 * Delete URLs older than 14 days
 */
async function deleteOldUrls() {
  try {
    await dbConnect();
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setMinutes(fourteenDaysAgo.getDate() - 14);
    await Url.deleteMany({ createdAt: { $lt: fourteenDaysAgo } });
  } catch (e) {
    console.error((e as Error).message);
  }
}
