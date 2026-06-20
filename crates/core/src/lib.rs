use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub tracks: Vec<Track>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Track {
    pub id: String,
    pub name: String,
    pub clips: Vec<Clip>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Clip {
    pub id: String,
    pub name: String,
    pub start_time: f64,
    pub duration: f64,
}

impl Project {
    pub fn new(name: &str) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            tracks: Vec::new(),
        }
    }

    pub fn add_track(&mut self, name: &str) -> String {
        let track = Track {
            id: Uuid::new_v4().to_string(),
            name: name.to_string(),
            clips: Vec::new(),
        };
        let id = track.id.clone();
        self.tracks.push(track);
        id
    }

    pub fn add_clip(&mut self, track_id: &str, name: &str, start_time: f64, duration: f64) -> Option<String> {
        if let Some(track) = self.tracks.iter_mut().find(|t| t.id == track_id) {
            let clip = Clip {
                id: Uuid::new_v4().to_string(),
                name: name.to_string(),
                start_time,
                duration,
            };
            let id = clip.id.clone();
            track.clips.push(clip);
            Some(id)
        } else {
            None
        }
    }

    pub fn delete_clip(&mut self, clip_id: &str) -> bool {
        for track in &mut self.tracks {
            if let Some(idx) = track.clips.iter().position(|c| c.id == clip_id) {
                track.clips.remove(idx);
                return true;
            }
        }
        false
    }

    pub fn update_clip(&mut self, clip_id: &str, start_time: f64, duration: f64) -> bool {
        for track in &mut self.tracks {
            if let Some(clip) = track.clips.iter_mut().find(|c| c.id == clip_id) {
                clip.start_time = start_time;
                clip.duration = duration;
                return true;
            }
        }
        false
    }
}
