/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chat from "../chat.js";
import type * as chunks from "../chunks.js";
import type * as debug from "../debug.js";
import type * as folders from "../folders.js";
import type * as lib_gemini from "../lib/gemini.js";
import type * as lib_openrouter from "../lib/openrouter.js";
import type * as search from "../search.js";
import type * as summaryActions from "../summaryActions.js";
import type * as tempStats from "../tempStats.js";
import type * as testLoad from "../testLoad.js";
import type * as trigger from "../trigger.js";
import type * as videoActions from "../videoActions.js";
import type * as videos from "../videos.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chat: typeof chat;
  chunks: typeof chunks;
  debug: typeof debug;
  folders: typeof folders;
  "lib/gemini": typeof lib_gemini;
  "lib/openrouter": typeof lib_openrouter;
  search: typeof search;
  summaryActions: typeof summaryActions;
  tempStats: typeof tempStats;
  testLoad: typeof testLoad;
  trigger: typeof trigger;
  videoActions: typeof videoActions;
  videos: typeof videos;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
