import type { APIRoute } from 'astro';
import { getSiteConfig } from '../config/site';
import { robotsTxt } from '../lib/robots';

export const GET: APIRoute = () => {
  const { siteUrl, indexable } = getSiteConfig(process.env);
  return new Response(robotsTxt({ indexable, siteUrl }), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
