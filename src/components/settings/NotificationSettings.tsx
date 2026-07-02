import { useContext } from "react";
import { Box, Button, FormControlLabel, FormGroup, Switch, Typography } from "@mui/material";
import { InfoOutlined, NotificationsRounded } from "@mui/icons-material";
import { UserContext } from "../../contexts/UserContext";
import {
  isNotificationSupported,
  requestNotificationPermission,
  showLocalNotification,
  showToast,
  systemInfo,
} from "../../utils";

export default function NotificationSettings() {
  const { user, setUser } = useContext(UserContext);
  const enabled = user.settings.enableReminders;

  const supported = isNotificationSupported();
  // iOS only exposes web notifications inside an installed (standalone) PWA.
  const available = supported && (systemInfo.os !== "iOS" || systemInfo.isPWA);
  const blocked =
    supported && typeof Notification !== "undefined" && Notification.permission === "denied";

  const setEnabled = (value: boolean) =>
    setUser((prev) => ({ ...prev, settings: { ...prev.settings, enableReminders: value } }));

  const handleEnable = (checked: boolean) => {
    if (!checked) {
      setEnabled(false);
      return;
    }
    // Called from a user gesture; request permission before any await (iOS requirement).
    requestNotificationPermission().then((permission) => {
      if (permission === "granted") {
        setEnabled(true);
      } else {
        setEnabled(false);
        showToast(
          permission === "denied"
            ? "Notifications are blocked. Enable them in your device settings."
            : "Notification permission was not granted.",
          { type: "error" },
        );
      }
    });
  };

  const handleTest = () => {
    requestNotificationPermission().then(async (permission) => {
      if (permission !== "granted") {
        showToast("Allow notifications first to send a test.", { type: "error" });
        return;
      }
      const shown = await showLocalNotification("Test notification ✅", {
        body: "Notifications are working on this device.",
        tag: "test-notification",
      });
      if (!shown) {
        showToast("Couldn't display the notification. Is the app installed as a PWA?", {
          type: "error",
        });
      }
    });
  };

  return (
    <Box
      sx={{ my: 2, mx: 1, display: "flex", flexDirection: "column", opacity: available ? 1 : 0.6 }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: "text.primary", fontSize: "16px" }}>
          Task Reminders
        </Typography>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                checked={enabled}
                onChange={(e) => handleEnable(e.target.checked)}
                disabled={!available}
              />
            }
            label=""
          />
        </FormGroup>
      </Box>

      <Typography variant="body2" sx={{ color: "text.secondary", mt: 0 }}>
        Get a notification when a task's deadline is reached while the app is open.
      </Typography>

      {!available && (
        <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
          <InfoOutlined fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="caption">
            {supported
              ? "On iPhone, add the app to your Home Screen and open it from there to enable notifications."
              : "Your browser doesn't support notifications."}
          </Typography>
        </Box>
      )}

      {available && blocked && (
        <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
          <InfoOutlined fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="caption">
            Notifications are blocked. Enable them for this app in your device settings.
          </Typography>
        </Box>
      )}

      {available && (
        <Button
          variant="outlined"
          startIcon={<NotificationsRounded />}
          onClick={handleTest}
          sx={{ mt: 1.5, alignSelf: "flex-start", borderRadius: "12px", p: "8px 18px" }}
        >
          Send test notification
        </Button>
      )}
    </Box>
  );
}
