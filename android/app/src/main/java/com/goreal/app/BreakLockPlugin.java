package com.goreal.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.os.Build;
import android.os.SystemClock;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import android.widget.RemoteViews;

/**
 * A quiet notification that stays on the lock screen for the rest of a break.
 * The countdown is a system chronometer, so it keeps moving after the screen turns off
 * and after Android stops the app. It does not hold the screen awake.
 */
@CapacitorPlugin(
    name = "BreakLock",
    permissions = {
        @Permission(strings = { android.Manifest.permission.POST_NOTIFICATIONS }, alias = "notifications")
    }
)
public class BreakLockPlugin extends Plugin {

    private static final String CHANNEL = "goreal-break";
    private static final int NOTE = 7042;

    @PluginMethod
    public void show(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "showAfterPermission");
            return;
        }
        post(call);
        call.resolve();
    }

    @PermissionCallback
    private void showAfterPermission(PluginCall call) {
        if (getPermissionState("notifications") == PermissionState.GRANTED) post(call);
        call.resolve();
    }

    @PluginMethod
    public void hide(PluginCall call) {
        NotificationManager manager = getContext().getSystemService(NotificationManager.class);
        if (manager != null) manager.cancel(NOTE);
        call.resolve();
    }

    private void post(PluginCall call) {
        long endAt = call.getLong("endAt", 0L);
        long remaining = endAt - System.currentTimeMillis();
        if (remaining <= 1_000) return;

        String title = call.getString("title", "Break");
        String subtitle = call.getString("subtitle", "");
        String body = call.getString("body", subtitle);
        int color = parseColor(call.getString("color", "#fc4c02"));

        ensureChannel();

        RemoteViews views = new RemoteViews(getContext().getPackageName(), R.layout.break_lock);
        views.setImageViewBitmap(R.id.rilo, rilo(color));
        views.setTextViewText(R.id.title, title);
        views.setTextViewText(R.id.subtitle, body.isEmpty() ? subtitle : body);
        long base = SystemClock.elapsedRealtime() + remaining;
        views.setChronometer(R.id.countdown, base, null, true);
        views.setChronometerCountDown(R.id.countdown, true);

        PendingIntent open = PendingIntent.getActivity(
            getContext(),
            0,
            getContext().getPackageManager().getLaunchIntentForPackage(getContext().getPackageName()),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification note = new NotificationCompat.Builder(getContext(), CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_rilo)
            .setLargeIcon(rilo(color))
            .setContentTitle(title)
            .setContentText(body)
            .setCustomContentView(views)
            .setCustomBigContentView(views)
            .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setTimeoutAfter(remaining)
            .setContentIntent(open)
            .build();

        NotificationManager manager = getContext().getSystemService(NotificationManager.class);
        if (manager != null) manager.notify(NOTE, note);
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager manager = getContext().getSystemService(NotificationManager.class);
        if (manager == null || manager.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL, "Break", NotificationManager.IMPORTANCE_LOW);
        channel.setDescription("How long is left on a break");
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.setSound(null, null);
        channel.enableVibration(false);
        manager.createNotificationChannel(channel);
    }

    /** A small pixel Rilo in the accent colour: a round head, two eyes, a smile. */
    private Bitmap rilo(int color) {
        int size = 128;
        Bitmap bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bitmap);
        Paint paint = new Paint();
        paint.setColor(color);
        float r = size * 0.42f;
        canvas.drawCircle(size / 2f, size / 2f, r, paint);
        paint.setColor(Color.BLACK);
        float eye = size * 0.07f;
        canvas.drawRect(size * 0.34f, size * 0.40f, size * 0.34f + eye, size * 0.40f + eye, paint);
        canvas.drawRect(size * 0.59f, size * 0.40f, size * 0.59f + eye, size * 0.40f + eye, paint);
        canvas.drawRect(size * 0.40f, size * 0.62f, size * 0.60f, size * 0.62f + size * 0.045f, paint);
        canvas.drawRect(size * 0.36f, size * 0.58f, size * 0.40f, size * 0.62f, paint);
        canvas.drawRect(size * 0.60f, size * 0.58f, size * 0.64f, size * 0.62f, paint);
        return bitmap;
    }

    private int parseColor(String hex) {
        try {
            return Color.parseColor(hex);
        } catch (IllegalArgumentException ignored) {
            return Color.parseColor("#fc4c02");
        }
    }
}
