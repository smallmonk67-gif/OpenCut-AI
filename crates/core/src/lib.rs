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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_project_new() {
        let name = "Test Project";
        let project = Project::new(name);

        assert!(!project.id.is_empty(), "Project ID should not be empty");
        assert_eq!(project.name, name, "Project name should match the input");
        assert!(project.tracks.is_empty(), "Project should initialize with empty tracks");
    fn test_delete_existing_clip() {
        let mut project = Project::new("Test Project");
        let track_id = project.add_track("Track 1");
        let clip_id = project.add_clip(&track_id, "Clip 1", 0.0, 10.0).unwrap();

        assert_eq!(project.tracks[0].clips.len(), 1);

        let result = project.delete_clip(&clip_id);

        assert!(result);
        assert_eq!(project.tracks[0].clips.len(), 0);
    }

    #[test]
    fn test_delete_non_existent_clip() {
        let mut project = Project::new("Test Project");
        let track_id = project.add_track("Track 1");
        project.add_clip(&track_id, "Clip 1", 0.0, 10.0).unwrap();

        assert_eq!(project.tracks[0].clips.len(), 1);

        let result = project.delete_clip("non-existent-id");

        assert!(!result);
        assert_eq!(project.tracks[0].clips.len(), 1);
    }
}
