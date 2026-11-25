// The web app has no widget (docs/product.md 7.4).
export const syncWidget = async (): Promise<void> => {};
export const startWidgetSync = (): (() => void) => () => {};
export const useWidgetUrl = (): string | null => null;
