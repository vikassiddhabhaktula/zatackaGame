#ifndef DISPLAY_H
#define DISPLAY_H

#include <iostream>
#include <vector>
#include "common.h"

class Display {
    uint32_t _dispWidth;
    uint32_t _dispHeight;
    Display(uint32_t width, uint32_t height) :
        _dispWidth(width), _dispHeight(height) {}
    Display();
public:
    Display(const Display&) = delete;
    static void create_display(const uint32_t &width, const uint32_t &height);
    void get_resolution(uint32_t *width, uint32_t *height) const;
    void mark(Point point, uint32_t color);
    void clear(Point point);
};

#endif // !DISPLAY_H