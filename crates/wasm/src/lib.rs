use wasm_bindgen::prelude::*;
use opencut_core::Project;
use serde_wasm_bindgen::to_value;

#[wasm_bindgen]
pub struct WasmProject {
    inner: Project,
}

#[wasm_bindgen]
impl WasmProject {
    #[wasm_bindgen(constructor)]
    pub fn new(name: &str) -> Self {
        Self {
            inner: Project::new(name),
        }
    }

    #[wasm_bindgen]
    pub fn get_state(&self) -> Result<JsValue, JsValue> {
        to_value(&self.inner).map_err(|e| e.into())
    }

    #[wasm_bindgen]
    pub fn add_track(&mut self, name: &str) -> String {
        self.inner.add_track(name)
    }

    #[wasm_bindgen]
    pub fn add_clip(&mut self, track_id: &str, name: &str, start_time: f64, duration: f64) -> JsValue {
        if let Some(id) = self.inner.add_clip(track_id, name, start_time, duration) {
            JsValue::from_str(&id)
        } else {
            JsValue::NULL
        }
    }

    #[wasm_bindgen]
    pub fn delete_clip(&mut self, clip_id: &str) -> bool {
        self.inner.delete_clip(clip_id)
    }

    #[wasm_bindgen]
    pub fn update_clip(&mut self, clip_id: &str, start_time: f64, duration: f64) -> bool {
        self.inner.update_clip(clip_id, start_time, duration)
    }

    #[wasm_bindgen]
    pub fn get_fonts() -> JsValue {
        // In the WebAssembly environment, the host OS's filesystem cannot be accessed.
        // Therefore, system-level functions like fontdb::Database::load_system_fonts() will hang/fail.
        // Return a hardcoded list of standard web fonts to ensure instant loading.
        let fonts = vec![
            "Arial".to_string(),
            "Courier New".to_string(),
            "Georgia".to_string(),
            "Times New Roman".to_string(),
            "Verdana".to_string(),
            "Trebuchet MS".to_string(),
            "Impact".to_string(),
            "Comic Sans MS".to_string(),
        ];
        to_value(&fonts).unwrap_or(JsValue::NULL)
    }
}
