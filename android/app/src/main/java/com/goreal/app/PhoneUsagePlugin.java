package com.goreal.app;

import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * Reads when the apps picked in onboarding were on screen, from Android's usage access
 * (UsageStatsManager). Only the packages GoReal asks for are reported, plus games if asked:
 * nothing about other apps, and nothing from inside any app, ever leaves this class.
 */
@CapacitorPlugin(name = "PhoneUsage")
public class PhoneUsagePlugin extends Plugin {

    // UsageEvents.Event constants, by value so they also compile against the older names on API 24 to 28.
    private static final int RESUMED = 1;
    private static final int PAUSED = 2;
    private static final int SCREEN_OFF = 16;
    private static final int STOPPED = 23;
    private static final int SHUTDOWN = 26;

    private final Map<String, Boolean> gameCache = new HashMap<>();

    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        result.put("granted", hasAccess());
        call.resolve(result);
    }

    /** Opens the "Usage access" screen, on GoReal's own switch where the phone supports that. */
    @PluginMethod
    public void openSettings(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.setData(Uri.fromParts("package", context.getPackageName(), null));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            context.startActivity(intent);
        } catch (ActivityNotFoundException e) {
            context.startActivity(new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        }
        call.resolve();
    }

    /** Which of the given packages are installed. */
    @PluginMethod
    public void installed(PluginCall call) {
        JSArray packages = call.getArray("packages", new JSArray());
        JSArray found = new JSArray();
        PackageManager pm = getContext().getPackageManager();
        for (int i = 0; i < packages.length(); i++) {
            String pkg = packages.optString(i);
            try {
                pm.getApplicationInfo(pkg, 0);
                found.put(pkg);
            } catch (PackageManager.NameNotFoundException ignored) {
                // Not on this phone.
            }
        }
        JSObject result = new JSObject();
        result.put("packages", found);
        call.resolve(result);
    }

    /**
     * Stretches of time a watched app was on screen between `from` and `to`, as { app, start, end }.
     * `packages` maps package names to the app name to report. With `gamesLabel`, every app that says
     * it is a game is reported under that name too.
     */
    @PluginMethod
    public void intervals(PluginCall call) {
        if (!hasAccess()) {
            call.reject("Usage access is off", "NO_ACCESS");
            return;
        }
        long from = call.getLong("from", 0L);
        long to = call.getLong("to", System.currentTimeMillis());
        JSObject packages = call.getObject("packages", new JSObject());
        String gamesLabel = call.getString("gamesLabel");

        UsageStatsManager usm = (UsageStatsManager) getContext().getSystemService(Context.USAGE_STATS_SERVICE);
        UsageEvents events = usm.queryEvents(from, to);
        UsageEvents.Event event = new UsageEvents.Event();
        // One entry per activity on screen, so apps that switch between their own screens are not cut short.
        Map<String, long[]> open = new HashMap<>();
        Map<String, String> openApp = new HashMap<>();
        JSArray out = new JSArray();

        while (events.hasNextEvent()) {
            events.getNextEvent(event);
            int type = event.getEventType();
            long time = event.getTimeStamp();
            String pkg = event.getPackageName();

            if (type == SCREEN_OFF || type == SHUTDOWN) {
                closeAll(open, openApp, null, time, out);
                continue;
            }
            if (type == RESUMED) {
                // Whatever comes to the front (the home screen, GoReal, any app) ends the other apps' time.
                closeAll(open, openApp, pkg, time, out);
            }
            String app = appFor(pkg, packages, gamesLabel);
            if (app == null) continue;
            String key = pkg + "/" + event.getClassName();
            if (type == RESUMED) {
                if (!open.containsKey(key)) {
                    open.put(key, new long[] {time});
                    openApp.put(key, app);
                }
            } else if (type == PAUSED || type == STOPPED) {
                long[] start = open.remove(key);
                String name = openApp.remove(key);
                if (start != null) add(out, name, start[0], time);
            }
        }
        // Still on screen right now.
        closeAll(open, openApp, null, to, out);

        JSObject result = new JSObject();
        result.put("intervals", out);
        call.resolve(result);
    }

    private void closeAll(Map<String, long[]> open, Map<String, String> openApp, String except, long time, JSArray out) {
        Iterator<Map.Entry<String, long[]>> it = open.entrySet().iterator();
        while (it.hasNext()) {
            Map.Entry<String, long[]> entry = it.next();
            String key = entry.getKey();
            if (except != null && key.startsWith(except + "/")) continue;
            add(out, openApp.remove(key), entry.getValue()[0], time);
            it.remove();
        }
    }

    private void add(JSArray out, String app, long start, long end) {
        if (end <= start) return;
        JSObject item = new JSObject();
        item.put("app", app);
        item.put("start", start);
        item.put("end", end);
        out.put(item);
    }

    private String appFor(String pkg, JSObject packages, String gamesLabel) {
        String app = packages.getString(pkg);
        if (app != null) return app;
        if (gamesLabel != null && isGame(pkg)) return gamesLabel;
        return null;
    }

    @SuppressWarnings("deprecation")
    private boolean isGame(String pkg) {
        Boolean cached = gameCache.get(pkg);
        if (cached != null) return cached;
        boolean game = false;
        try {
            ApplicationInfo info = getContext().getPackageManager().getApplicationInfo(pkg, 0);
            game = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? info.category == ApplicationInfo.CATEGORY_GAME || (info.flags & ApplicationInfo.FLAG_IS_GAME) != 0
                : (info.flags & ApplicationInfo.FLAG_IS_GAME) != 0;
        } catch (PackageManager.NameNotFoundException ignored) {
            // Uninstalled since, or hidden from GoReal.
        }
        gameCache.put(pkg, game);
        return game;
    }

    @SuppressWarnings("deprecation")
    private boolean hasAccess() {
        Context context = getContext();
        AppOpsManager ops = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        int mode = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
            ? ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.getPackageName())
            : ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), context.getPackageName());
        if (mode == AppOpsManager.MODE_DEFAULT) {
            return context.checkCallingOrSelfPermission(android.Manifest.permission.PACKAGE_USAGE_STATS)
                == PackageManager.PERMISSION_GRANTED;
        }
        return mode == AppOpsManager.MODE_ALLOWED;
    }
}
