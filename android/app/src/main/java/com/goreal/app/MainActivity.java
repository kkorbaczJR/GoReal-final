package com.goreal.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PhoneUsagePlugin.class);
        registerPlugin(BreakLockPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
