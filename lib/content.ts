import "server-only";
import { cache } from "react";
import { serverApi } from "@/lib/api-server";
import type {
  ContentResponse,
  ReviewRecord,
  DiaryRecord,
  ScreenshotRecord,
  JourneyResponse,
  ListResponse,
} from "@/lib/content-types";

import { ApiError } from "@/lib/api-client";
const read = cache(async (path: string) => {
  try {
    return await serverApi.get<unknown>(path);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
});
export const getReview = async (id: string) =>
  (await read(
    `/reviews/${encodeURIComponent(id)}`,
  )) as ContentResponse<ReviewRecord> | null;
export const getEntry = async (id: string) =>
  (await read(
    `/journal/entries/${encodeURIComponent(id)}`,
  )) as ContentResponse<DiaryRecord> | null;
export const getScreenshot = async (id: string) =>
  (await read(
    `/screenshots/${encodeURIComponent(id)}`,
  )) as ContentResponse<ScreenshotRecord> | null;
export const getJourney = async (id: string) =>
  (await read(
    `/journal/journeys/${encodeURIComponent(id)}`,
  )) as JourneyResponse | null;
export const getList = async (id: string) =>
  (await read(`/lists/${encodeURIComponent(id)}`)) as ListResponse | null;
