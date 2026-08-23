export type ErrorTrackingSink = {
  captureException: (error: unknown, extras: Record<string, unknown>) => void;
};

export const noopErrorTrackingSink: ErrorTrackingSink = {
  captureException() {
    /* flag off or DSN missing after boot */
  },
};
