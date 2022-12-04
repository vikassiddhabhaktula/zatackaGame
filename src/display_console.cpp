#include "display.h"

//  single object only
void Display::create_display(const uint32_t& width,
    const uint32_t& height) {
    Display(width, height);
}

// get resolution
void Display::get_resolution(uint32_t *width, uint32_t *height) const {
    *width = _dispWidth;
    *height = _dispHeight;
}

//  TODO: Draw
void Display::mark(Point point, uint32_t color) {
    (void) point;
    (void) color;
    LOG("Drawing at point: (", std::to_string(point.x), ", ",
        std::to_string(point.y), "); Color: ", std::to_string(color));
}

//  TODO: Clear the coordinate
void Display::clear(Point point) {
    (void) point;
    LOG("Clearing point: ", std::to_string(point.x), ", ",
        std::to_string(point.y), "):");
}