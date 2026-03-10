export {};

declare module "vue" {
  interface ComponentCustomProperties {
    i18n: { [key: string]: string };
  }
}
