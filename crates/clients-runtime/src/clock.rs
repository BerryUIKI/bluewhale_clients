//! Clock and identifier sources used by the runtime services.

use core_application::{Clock, IdSource};
use jiff::Timestamp;
use uuid::Uuid;

/// Reads the system clock.
#[derive(Debug, Default, Clone, Copy)]
pub struct SystemClock;

impl Clock for SystemClock {
    fn now(&self) -> Timestamp {
        Timestamp::now()
    }
}

/// Generates UUID version 7 identifiers.
#[derive(Debug, Default, Clone, Copy)]
pub struct Uuidv7Source;

impl IdSource for Uuidv7Source {
    fn next_uuid(&self) -> Uuid {
        Uuid::now_v7()
    }
}
