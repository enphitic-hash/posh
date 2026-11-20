package ug.co.poshproperties.passport;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PoshNfcPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
