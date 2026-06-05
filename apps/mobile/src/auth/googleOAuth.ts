import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { getApiRoot, setTokens } from "../api";
import { registerPushNotifications } from "../pushNotifications";

export async function runGoogleOAuth(
  navigation: { navigate: (name: "Home") => void },
) {
  const redirect = Linking.createURL("oauth");
  const result = await WebBrowser.openAuthSessionAsync(
    `${getApiRoot()}/v1/auth/google?mobile=1`,
    redirect,
  );
  if (result.type !== "success" || !result.url) {
    throw new Error("google oauth cancelled");
  }
  const parsed = Linking.parse(result.url);
  const access =
    typeof parsed.queryParams?.access === "string"
      ? parsed.queryParams.access
      : null;
  const refresh =
    typeof parsed.queryParams?.refresh === "string"
      ? parsed.queryParams.refresh
      : null;
  if (!access || !refresh) {
    throw new Error("google oauth missing tokens");
  }
  await setTokens(access, refresh);
  await registerPushNotifications().catch(() => undefined);
  navigation.navigate("Home");
}
