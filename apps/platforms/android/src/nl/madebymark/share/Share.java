package nl.madebymark.share;

import java.io.File;
import java.io.FileOutputStream;
import java.util.Calendar;

import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.CallbackContext;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.util.Base64;

import android.content.Intent;
import android.content.Context;

import android.os.Build;
import android.os.Environment;



    public class Share extends CordovaPlugin {

        @Override
        public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
            if (action.equals("share")) {
                String text = args.getString(0);
                String title = args.getString(1);
                String mimetype = args.getString(2);
                this.share(text, title, mimetype, callbackContext);
                return true;
            }
            return false;
        }

        private void share(String text, String title, String mimetype, CallbackContext callbackContext) {
            if(mimetype.equals("text/plain") || mimetype.equals("image/jpeg") || mimetype.equals("image/png")) {
                if (text.equals(""))
                    callbackContext.error("Missing base64 string");
            
                // Create the bitmap from the base64 string
                byte[] decodedString = Base64.decode(text, Base64.DEFAULT);
                Bitmap bmp = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);
                File imageFile = saveImage(bmp, callbackContext);

                Intent sendIntent = new Intent();

                sendIntent.setAction(Intent.ACTION_SEND);
                sendIntent.setType(mimetype);

                Uri uri = Uri.fromFile(imageFile);
                sendIntent.putExtra(Intent.EXTRA_STREAM, uri);

                sendIntent.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);


                try {

                    Intent chooser = Intent.createChooser(sendIntent, title);
                    cordova.getActivity().startActivity(chooser);
                    callbackContext.success();
  
                } catch(Error e) {
                    callbackContext.error(e.getMessage());
                }  
            } else {
                callbackContext.error(mimetype);
            }
          
        }


        private File saveImage(Bitmap bmp, CallbackContext callbackContext) {
            File retVal = null;
            
            try {
                Calendar c = Calendar.getInstance();
                String date = "" + c.get(Calendar.DAY_OF_MONTH)
                        + c.get(Calendar.MONTH)
                        + c.get(Calendar.YEAR)
                        + c.get(Calendar.HOUR_OF_DAY)
                        + c.get(Calendar.MINUTE)
                        + c.get(Calendar.SECOND);

                String deviceVersion = Build.VERSION.RELEASE;
                int check = deviceVersion.compareTo("2.3.3");

                File folder;
                /*
                 * File path = Environment.getExternalStoragePublicDirectory(
                 * Environment.DIRECTORY_PICTURES ); //this throws error in Android
                 * 2.2
                 */
                if (check >= 1) {
                    folder = Environment
                        .getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
                    
                    if(!folder.exists()) {
                        folder.mkdirs();
                    }
                } else {
                    folder = Environment.getExternalStorageDirectory();
                }
                
                File imageFile = new File(folder, "citation-shared-" + date.toString() + ".png");

                FileOutputStream out = new FileOutputStream(imageFile);
                bmp.compress(Bitmap.CompressFormat.PNG, 100, out);
                out.flush();
                out.close();

                retVal = imageFile;
            } catch (Exception e) {
                callbackContext.error("Unable to save image");
            }
            return retVal;
        }

    }